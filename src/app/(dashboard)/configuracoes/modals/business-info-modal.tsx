"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import type { ConfiguracoesNegocio } from "@/lib/types";
import { Loader2, Search, ChevronRight } from "lucide-react";
import { formatPhoneNumber, cn } from "@/lib/utils";

const schema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(64, "Nome muito longo"),
  telefone: z.string().refine(v => {
    const digits = String(v).replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  }, "Telefone deve ter 10 ou 11 dígitos"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  endereco: z.object({
    cep: z.string().min(1, "CEP é obrigatório").refine(v => String(v).replace(/\D/g, "").length === 8, "CEP deve ter 8 dígitos"),
    logradouro: z.string().min(2, "Logradouro é obrigatório"),
    numero: z.string().min(1, "Número é obrigatório").max(10, "Número muito longo"),
    bairro: z.string().min(2, "Bairro é obrigatório"),
    cidade: z.string().min(2, "Cidade é obrigatória"),
    estado: z.string().length(2, "Estado deve ter 2 letras"),
  }),
});

type FormValues = z.infer<typeof schema>;

interface BusinessInfoModalProps {
  open: boolean;
  onClose: () => void;
  settings: ConfiguracoesNegocio | null;
  onSave: (data: Partial<ConfiguracoesNegocio>) => Promise<void>;
}

export default function BusinessInfoModal({ open, onClose, settings, onSave }: BusinessInfoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      nome: settings?.nome || "",
      telefone: formatPhoneNumber(settings?.telefone || ""),
      categoria: settings?.categoria || "",
      endereco: settings?.endereco || {
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Converter telefone para número
      const dataToSave = {
        ...data,
        telefone: parseInt(data.telefone.toString().replace(/\D/g, ''), 10),
      };
      await onSave(dataToSave);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAddress = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("endereco.logradouro", data.logradouro || "");
        form.setValue("endereco.bairro", data.bairro || "");
        form.setValue("endereco.cidade", data.localidade || "");
        form.setValue("endereco.estado", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informações do Negócio</DialogTitle>
          <DialogDescription>
            Configure o nome, telefone, categoria e endereço do seu negócio.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Nome e Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Negócio</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Clínica São José" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone/WhatsApp</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => {
                const categories = [
                  { value: "Barbearia", label: "Barbearia 💈" },
                  { value: "ClinicaDeFisioterapia", label: "Clínica de Fisioterapia 🏃" },
                  { value: "ClinicaMedica", label: "Clínica Médica 🩺" },
                  { value: "ClinicaNutricionista", label: "Clínica Nutricionista 🥗" },
                  { value: "ClinicaOdontologica", label: "Clínica Odontológica 🦷" },
                  { value: "ClinicaPsicologica", label: "Clínica Psicológica 🧠" },
                  { value: "Estetica", label: "Estética 💄" },
                  { value: "LashDesigner", label: "Lash Designer 👁️" },
                  { value: "NailDesigner", label: "Nail Designer 💅" },
                  { value: "SalaoDeBeleza", label: "Salão de Beleza 💇" },
                  { value: "TecnicoInformatica", label: "Técnico de Informática 💻" },
                ];

                const selectedCategory = categories.find(cat => cat.value === field.value);
                const filteredCategories = categories.filter(cat => 
                  cat.label.toLowerCase().includes(categorySearch.toLowerCase())
                );

                return (
                  <>
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          onClick={() => setIsCategoryDialogOpen(true)}
                        >
                          {selectedCategory ? selectedCategory.label : "Selecione a categoria"}
                          <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                      <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>Selecione a Categoria</DialogTitle>
                          <DialogDescription>
                            Escolha a categoria que melhor representa seu negócio
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar categoria..."
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              autoFocus={false}
                              className="pl-10"
                            />
                          </div>
                          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map((category) => (
                                <Button
                                  key={category.value}
                                  type="button"
                                  variant={field.value === category.value ? "secondary" : "ghost"}
                                  className="w-full justify-start text-left h-auto py-3"
                                  onClick={() => {
                                    field.onChange(category.value);
                                    setIsCategoryDialogOpen(false);
                                    setCategorySearch('');
                                  }}
                                >
                                  <span className="text-base">{category.label}</span>
                                </Button>
                              ))
                            ) : (
                              <p className="text-center text-muted-foreground py-8">
                                Nenhuma categoria encontrada
                              </p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                );
              }}
            />

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Endereço</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="endereco.cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00000-000"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            fetchAddress(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco.logradouro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="endereco.numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco.bairro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco.cidade"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco.estado"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Estado (UF)</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { BusinessInfoModal };
