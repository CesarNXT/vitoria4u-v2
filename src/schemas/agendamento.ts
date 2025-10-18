import { z } from "zod";

/**
 * Schema de validação para agendamento
 */
export const AgendamentoSchema = z.object({
  clienteId: z.string().uuid("ID do cliente inválido"),
  
  servicoId: z.string().uuid("ID do serviço inválido"),
  
  profissionalId: z.string().uuid("ID do profissional inválido").optional(),
  
  data: z.coerce.date({
    required_error: "Data é obrigatória",
    invalid_type_error: "Data inválida",
  }),
  
  hora: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Hora inválida. Use formato HH:MM"),
  
  duracao: z
    .number()
    .int("Duração deve ser um número inteiro")
    .positive("Duração deve ser positiva")
    .max(480, "Duração máxima de 8 horas"),
  
  observacoes: z.string().max(500, "Observações muito longas").optional(),
  
  status: z.enum(["pendente", "confirmado", "cancelado", "concluido", "nao_compareceu"], {
    errorMap: () => ({ message: "Status inválido" }),
  }).default("pendente"),
  
  valorTotal: z
    .number()
    .nonnegative("Valor não pode ser negativo")
    .multipleOf(0.01, "Valor deve ter no máximo 2 casas decimais"),
  
  lembreteEnviado24h: z.boolean().default(false),
  
  lembreteEnviado4h: z.boolean().default(false),
  
  recorrente: z.boolean().default(false),
  
  recorrenciaConfig: z.object({
    frequencia: z.enum(["semanal", "quinzenal", "mensal"]),
    diaSemanaNome: z.enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]).optional(),
    diaDoMes: z.number().int().min(1).max(31).optional(),
    dataFim: z.coerce.date().optional(),
  }).optional(),
});

/**
 * Schema para confirmação de agendamento via WhatsApp
 */
export const ConfirmacaoAgendamentoSchema = z.object({
  agendamentoId: z.string().uuid("ID do agendamento inválido"),
  acao: z.enum(["confirmar", "remarcar", "cancelar"]),
  novaData: z.coerce.date().optional(),
  novaHora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  motivo: z.string().max(200).optional(),
});

/**
 * Schema para verificação de conflitos de horário
 */
export const VerificarConflitoSchema = z.object({
  profissionalId: z.string().uuid().optional(),
  data: z.coerce.date(),
  horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  horaFim: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  agendamentoExcluirId: z.string().uuid().optional(), // Para ignorar ao editar
});

/**
 * Type inference dos schemas
 */
export type Agendamento = z.infer<typeof AgendamentoSchema>;
export type ConfirmacaoAgendamento = z.infer<typeof ConfirmacaoAgendamentoSchema>;
export type VerificarConflito = z.infer<typeof VerificarConflitoSchema>;
