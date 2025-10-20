"use client"

import { useState, useEffect, useMemo } from 'react';
import { getServicesOnSnapshot, getProfessionalsOnSnapshot, saveOrUpdateDocument, deleteDocument, getBusinessConfig } from '@/lib/firestore';
import { useFirebase } from '@/firebase';
import { useBusinessUser } from '@/contexts/BusinessUserContext';
import type { Servico, Profissional, User, ConfiguracoesNegocio, PlanoSaude } from '@/lib/types';
import { handleError } from '@/lib/error-handler';
import { generateUUID } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Users } from 'lucide-react';
import { getColumns } from './columns';
import { DataTable } from '@/components/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ServiceForm } from './service-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { ServiceCard } from './service-card';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

// Utility function to serialize Firestore Timestamps to plain objects
function serializeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Timestamp) {
    return obj.toDate() as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeTimestamps((obj as any)[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}


export default function ServicesPage() {
  const { businessUserId } = useBusinessUser();
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [services, setServices] = useState<Servico[]>([]);
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professionalsLoaded, setProfessionalsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Servico | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Servico | null>(null);
  const [filter, setFilter] = useState('');
  
  const finalUserId = businessUserId || user?.uid;

  useEffect(() => {
    if (!finalUserId) return;
    
    setIsLoading(true);
    setProfessionalsLoaded(false);

    const unsubServices = getServicesOnSnapshot(finalUserId, (data) => {
        setServices(data);
    });

    const unsubProfessionals = getProfessionalsOnSnapshot(finalUserId, (data) => {
        setProfessionals(data);
        setProfessionalsLoaded(true); // Marca que profissionais foram carregados
    });
    
    getBusinessConfig(finalUserId).then(settings => {
      setBusinessSettings(serializeTimestamps(settings));
    });

    return () => {
        unsubServices();
        unsubProfessionals();
    };
  }, [finalUserId]);
  
  // Só considera carregado quando profissionais forem carregados
  useEffect(() => {
    if (professionalsLoaded) {
      setIsLoading(false);
    }
  }, [professionalsLoaded]);

  const handleCreateNew = () => {
    setSelectedService(null);
    setIsFormModalOpen(true);
  }

  const handleEdit = (service: Servico) => {
    setSelectedService(service);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteRequest = (service: Servico) => {
    setServiceToDelete(service);
    setIsAlertDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (serviceToDelete && finalUserId) {
      await deleteDocument('servicos', serviceToDelete.id, finalUserId);
      toast({
        title: "Serviço Excluído",
        description: `O serviço "${serviceToDelete.name}" foi excluído com sucesso.`,
      })
      setServiceToDelete(null);
    }
    setIsAlertDialogOpen(false);
  };


  const handleFormSubmit = async (data: Omit<Servico, 'id' | 'professionals'> & { professionals: string[], planosAceitos?: string[] }) => {
    if (!finalUserId || isSubmitting || !businessSettings) return;
    
    setIsSubmitting(true);

    try {
        const id = selectedService ? selectedService.id : `serv-${Date.now()}-${generateUUID().slice(0, 8)}`;
        
        const professionalData = data.professionals.map(profId => {
            const prof = professionals.find(p => p.id === profId);
            return { id: profId, name: prof ? prof.name : 'Desconhecido' };
        });
        
        // Converter IDs de planos para objetos PlanoSaude
        const planosAceitosData = data.planosAceitos && data.planosAceitos.length > 0
            ? data.planosAceitos
                .map((planoId: string) => businessSettings.planosSaudeAceitos?.find((p: PlanoSaude) => p.id === planoId))
                .filter((plano): plano is PlanoSaude => plano !== undefined)
            : undefined;
        
        const serviceData: Omit<Servico, 'id'> = {
            name: data.name,
            description: data.description,
            price: data.price,
            priceType: data.priceType,
            custo: data.custo || 0,
            duration: data.duration,
            status: data.status,
            professionals: professionalData,
            imageUrl: data.imageUrl || undefined,
            returnInDays: data.returnInDays,
            instanciaWhatsapp: businessSettings.id,
            planosAceitos: planosAceitosData,
        };

        await saveOrUpdateDocument('servicos', id, serviceData, finalUserId);
        
        toast({ title: selectedService ? "Serviço Atualizado" : "Serviço Salvo" });

        setIsFormModalOpen(false);
        setSelectedService(null);
    } catch (error) {
        handleError(error, { context: 'Save service' });
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Não foi possível salvar o serviço. Tente novamente.",
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  const dynamicColumns = getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest });
  
  const filteredServices = useMemo(() => 
    services.filter(service => {
      const serviceName = String(service.name || '').toLowerCase();
      return serviceName.includes(filter.toLowerCase());
    }), [services, filter]);
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (professionals.length === 0) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center text-center h-[calc(100vh-10rem)] p-4 md:p-8">
          <div className="p-4 bg-secondary rounded-full">
            <Users className="h-10 w-10 text-secondary-foreground" />
          </div>
          <Card className="max-w-lg text-left">
              <CardHeader>
                  <CardTitle>Primeiro, cadastre um profissional</CardTitle>
                  <CardDescription>
                      Para adicionar um serviço, você precisa ter pelo menos um profissional cadastrado no sistema, pois os serviços precisam ser associados a quem os executa.
                  </CardDescription>
              </CardHeader>
              <CardFooter>
                  <Button asChild className="w-full" variant="gradient">
                      <Link href="/profissionais">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Cadastrar Profissional
                      </Link>
                  </Button>
              </CardFooter>
          </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground">Gerencie os serviços oferecidos pelo seu negócio.</p>
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Todos os Serviços</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="block md:hidden">
              <Input
                placeholder="Filtrar por nome do serviço..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mb-4"
              />
              <div className="space-y-4">
              {filteredServices.length > 0 ? (
                filteredServices.map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                  />
                ))
              ) : (
                 <p className="text-center text-muted-foreground py-8">Nenhum serviço encontrado.</p>
              )}
              </div>
          </div>
          <div className='hidden md:block'>
            <DataTable 
              columns={dynamicColumns} 
              data={services}
              filterColumn={{
                  id: "name",
                  placeholder: "Filtrar por nome..."
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormModalOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedService(null);
          }
          setIsFormModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
           <DialogHeader>
            <DialogTitle>{selectedService ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</DialogTitle>
            <DialogDescription>
              {selectedService 
                ? 'Altere os detalhes do serviço.' 
                : 'Preencha os detalhes para o novo serviço.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 -mx-1 md:px-6 md:-mx-6">
            {businessSettings && (
              <ServiceForm 
                  key={selectedService?.id || 'new-service-form'}
                  service={selectedService}
                  onSubmit={handleFormSubmit}
                  professionals={professionals}
                  planosSaudeDisponiveis={businessSettings.planosSaudeAceitos || []}
                  isSubmitting={isSubmitting}
                  businessCategory={businessSettings.categoria}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o serviço
              <span className="font-bold"> {serviceToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
