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
import { Loader2 } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";

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
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    try {
      await onSave(data);
    } finally {
      setIsLoading(false);
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Clínica médica">Clínica médica</SelectItem>
                      <SelectItem value="Consultório odontológico">Consultório odontológico</SelectItem>
                      <SelectItem value="Salão de beleza">Salão de beleza</SelectItem>
                      <SelectItem value="Barbearia">Barbearia</SelectItem>
                      <SelectItem value="Pet shop">Pet shop</SelectItem>
                      <SelectItem value="Academia">Academia</SelectItem>
                      <SelectItem value="Estética">Estética</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
