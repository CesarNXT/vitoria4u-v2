/**
 * 📅 CreateAppointment Use Case - IMPLEMENTAÇÃO REAL
 * Caso de uso para criação de agendamentos com toda lógica de negócio
 */

import { Appointment, AppointmentId } from '../entities/appointment';
import { Client, ClientId } from '../entities/client';
import { Service, ServiceId } from '../entities/service';
import { Professional, ProfessionalId } from '../entities/professional';
import { DateTime } from '../value-objects/date-time';
import { Phone } from '../value-objects/phone';
import { Money } from '../value-objects/money';

// ✅ Command Pattern para Input
export interface CreateAppointmentCommand {
  clientId: string;
  clientName: string;
  clientPhone: string | number;
  clientEmail?: string;
  clientBirthDate?: any;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  professionalId: string;
  professionalName: string;
  professionalPhone?: string | number;
  dateTime: string; // ISO string
  notes?: string;
  businessId: string;
}

// ✅ Result Pattern para Output
export interface CreateAppointmentResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  validationErrors?: Record<string, string>;
}

// ✅ Interface para Repositórios (Dependency Inversion)
export interface AppointmentRepository {
  save(appointment: Appointment, businessId: string): Promise<void>;
  findConflicts(
    professionalId: string,
    dateTime: DateTime,
    duration: number,
    businessId: string,
    excludeId?: string
  ): Promise<Appointment[]>;
  generateId(): Promise<string>;
}

export interface ClientRepository {
  findById(id: string, businessId: string): Promise<Client | null>;
  save(client: Client, businessId: string): Promise<void>;
}

export interface ServiceRepository {
  findById(id: string, businessId: string): Promise<Service | null>;
}

export interface ProfessionalRepository {
  findById(id: string, businessId: string): Promise<Professional | null>;
}

export interface AvailabilityService {
  isTimeSlotAvailable(
    professionalId: string,
    dateTime: DateTime,
    duration: number,
    businessId: string
  ): Promise<{ available: boolean; reason?: string }>;
  
  isDateBlocked(
    dateTime: DateTime,
    businessId: string
  ): Promise<{ blocked: boolean; reason?: string }>;
}

export interface NotificationService {
  sendAppointmentConfirmation(appointment: Appointment): Promise<void>;
  sendProfessionalNotification(appointment: Appointment): Promise<void>;
}

// ✅ Use Case Implementation
export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly clientRepo: ClientRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly professionalRepo: ProfessionalRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationService: NotificationService
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<CreateAppointmentResult> {
    try {
      // 1️⃣ Validar entrada
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors
        };
      }

      // 2️⃣ Carregar e validar entidades
      const entities = await this.loadAndValidateEntities(command);
      if (!entities.success) {
        return {
          success: false,
          error: entities.error
        };
      }

      // 3️⃣ Verificar disponibilidade
      const availabilityCheck = await this.checkAvailability(command, entities.data!);
      if (!availabilityCheck.available) {
        return {
          success: false,
          error: availabilityCheck.reason
        };
      }

      // 4️⃣ Criar agendamento
      const appointment = await this.createAppointment(command);

      // 5️⃣ Salvar no repositório
      await this.appointmentRepo.save(appointment, command.businessId);

      // 6️⃣ Enviar notificações (async, não bloqueia)
      this.sendNotifications(appointment).catch(error => {
        console.error('Erro ao enviar notificações:', error);
      });

      return {
        success: true,
        appointment
      };

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do sistema'
      };
    }
  }

  // ✅ Validação de entrada
  private async validateCommand(command: CreateAppointmentCommand): Promise<{
    isValid: boolean;
    errors?: Record<string, string>;
  }> {
    const errors: Record<string, string> = {};

    // Validar IDs obrigatórios
    if (!command.clientId?.trim()) {
      errors.clientId = 'Cliente é obrigatório';
    }

    if (!command.serviceId?.trim()) {
      errors.serviceId = 'Serviço é obrigatório';
    }

    if (!command.professionalId?.trim()) {
      errors.professionalId = 'Profissional é obrigatório';
    }

    if (!command.businessId?.trim()) {
      errors.businessId = 'Negócio é obrigatório';
    }

    // Validar dados do cliente
    if (!command.clientName?.trim()) {
      errors.clientName = 'Nome do cliente é obrigatório';
    }

    if (!command.clientPhone) {
      errors.clientPhone = 'Telefone do cliente é obrigatório';
    } else {
      try {
        Phone.create(command.clientPhone);
      } catch {
        errors.clientPhone = 'Telefone do cliente é inválido';
      }
    }

    if (command.clientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(command.clientEmail)) {
        errors.clientEmail = 'Email do cliente é inválido';
      }
    }

    // Validar dados do serviço
    if (!command.serviceName?.trim()) {
      errors.serviceName = 'Nome do serviço é obrigatório';
    }

    if (!command.serviceDuration || command.serviceDuration <= 0) {
      errors.serviceDuration = 'Duração do serviço deve ser positiva';
    }

    if (!command.servicePrice || command.servicePrice < 0) {
      errors.servicePrice = 'Preço do serviço deve ser válido';
    }

    // Validar dados do profissional
    if (!command.professionalName?.trim()) {
      errors.professionalName = 'Nome do profissional é obrigatório';
    }

    // Validar data/hora
    if (!command.dateTime?.trim()) {
      errors.dateTime = 'Data e hora são obrigatórias';
    } else {
      try {
        const dateTime = DateTime.fromISO(command.dateTime);
        
        // Não pode ser no passado
        if (dateTime.isPast()) {
          errors.dateTime = 'Não é possível agendar no passado';
        }

        // Deve ser em horário comercial (8h às 18h)
        const hour = dateTime.toDate().getHours();
        if (hour < 8 || hour >= 18) {
          errors.dateTime = 'Agendamentos devem ser entre 8h e 18h';
        }

        // Não pode ser domingo
        if (dateTime.getWeekday() === 0) {
          errors.dateTime = 'Não é possível agendar aos domingos';
        }

        // Deve ser com pelo menos 1 hora de antecedência
        const oneHourFromNow = DateTime.now().addHours(1);
        if (dateTime.isBefore(oneHourFromNow)) {
          errors.dateTime = 'Agendamento deve ser com pelo menos 1 hora de antecedência';
        }

      } catch {
        errors.dateTime = 'Data e hora inválidas';
      }
    }

    // Validar notas (opcional)
    if (command.notes && command.notes.length > 500) {
      errors.notes = 'Observações não podem exceder 500 caracteres';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }

  // ✅ Carregar e validar entidades
  private async loadAndValidateEntities(command: CreateAppointmentCommand): Promise<{
    success: boolean;
    data?: {
      client: Client | null;
      service: Service | null;
      professional: Professional | null;
    };
    error?: string;
  }> {
    try {
      const [client, service, professional] = await Promise.all([
        this.clientRepo.findById(command.clientId, command.businessId),
        this.serviceRepo.findById(command.serviceId, command.businessId),
        this.professionalRepo.findById(command.professionalId, command.businessId)
      ]);

      // Validar se o serviço existe e está ativo
      if (!service) {
        return { success: false, error: 'Serviço não encontrado' };
      }

      if (!service.isActive()) {
        return { success: false, error: 'Serviço não está ativo' };
      }

      if (!service.canBeBooked()) {
        return { success: false, error: 'Serviço não pode ser agendado' };
      }

      // Validar se o profissional existe e está disponível
      if (!professional) {
        return { success: false, error: 'Profissional não encontrado' };
      }

      if (!professional.isAvailable()) {
        return { success: false, error: 'Profissional não está disponível' };
      }

      if (!professional.canPerformService(service.id.toString())) {
        return { success: false, error: 'Profissional não habilitado para este serviço' };
      }

      return {
        success: true,
        data: { client, service, professional }
      };

    } catch (error) {
      console.error('Erro ao carregar entidades:', error);
      return { success: false, error: 'Erro ao carregar dados necessários' };
    }
  }

  // ✅ Verificar disponibilidade
  private async checkAvailability(
    command: CreateAppointmentCommand,
    entities: { client: Client | null; service: Service | null; professional: Professional | null }
  ): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const dateTime = DateTime.fromISO(command.dateTime);
    const duration = command.serviceDuration;

    // Verificar se a data não está bloqueada
    const dateBlockCheck = await this.availabilityService.isDateBlocked(dateTime, command.businessId);
    if (dateBlockCheck.blocked) {
      return {
        available: false,
        reason: dateBlockCheck.reason || 'Data bloqueada para agendamentos'
      };
    }

    // Verificar disponibilidade do profissional
    const availabilityCheck = await this.availabilityService.isTimeSlotAvailable(
      command.professionalId,
      dateTime,
      duration,
      command.businessId
    );

    if (!availabilityCheck.available) {
      return {
        available: false,
        reason: availabilityCheck.reason || 'Horário não disponível'
      };
    }

    // Verificar conflitos de agendamento
    const conflicts = await this.appointmentRepo.findConflicts(
      command.professionalId,
      dateTime,
      duration,
      command.businessId
    );

    if (conflicts.length > 0) {
      return {
        available: false,
        reason: 'Já existe um agendamento neste horário'
      };
    }

    return { available: true };
  }

  // ✅ Criar agendamento
  private async createAppointment(command: CreateAppointmentCommand): Promise<Appointment> {
    const appointmentId = await this.appointmentRepo.generateId();
    const dateTime = DateTime.fromISO(command.dateTime);

    return Appointment.create({
      id: appointmentId,
      clientId: command.clientId,
      clientName: command.clientName,
      clientPhone: command.clientPhone,
      clientEmail: command.clientEmail,
      clientBirthDate: command.clientBirthDate,
      serviceId: command.serviceId,
      serviceName: command.serviceName,
      serviceDuration: command.serviceDuration,
      servicePrice: command.servicePrice,
      professionalId: command.professionalId,
      professionalName: command.professionalName,
      professionalPhone: command.professionalPhone,
      dateTime,
      notes: command.notes
    });
  }

  // ✅ Enviar notificações (async)
  private async sendNotifications(appointment: Appointment): Promise<void> {
    try {
      // Notificar cliente
      await this.notificationService.sendAppointmentConfirmation(appointment);

      // Notificar profissional
      await this.notificationService.sendProfessionalNotification(appointment);

    } catch (error) {
      // Log do erro, mas não falha o agendamento
      console.error('Erro ao enviar notificações:', error);
    }
  }
}

// ✅ Factory para criar o use case com dependências
export class CreateAppointmentUseCaseFactory {
  static create(dependencies: {
    appointmentRepo: AppointmentRepository;
    clientRepo: ClientRepository;
    serviceRepo: ServiceRepository;
    professionalRepo: ProfessionalRepository;
    availabilityService: AvailabilityService;
    notificationService: NotificationService;
  }): CreateAppointmentUseCase {
    return new CreateAppointmentUseCase(
      dependencies.appointmentRepo,
      dependencies.clientRepo,
      dependencies.serviceRepo,
      dependencies.professionalRepo,
      dependencies.availabilityService,
      dependencies.notificationService
    );
  }
}
