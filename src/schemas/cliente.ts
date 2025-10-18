import { z } from "zod";
import { validarCPF } from "@/lib/validators/cpf";

/**
 * Schema de validação para telefone brasileiro
 * Aceita formatos: (XX) 9XXXX-XXXX, (XX) XXXX-XXXX, +55 XX 9XXXX-XXXX
 */
export const telefoneBR = z
  .string()
  .trim()
  .regex(
    /^\+?55?\s?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}$/,
    "Telefone inválido. Use formato: (XX) 9XXXX-XXXX"
  );

/**
 * Schema de validação para CPF brasileiro
 * Valida dígitos verificadores
 */
export const cpfSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "CPF deve conter 11 dígitos")
  .refine((val) => validarCPF(val), {
    message: "CPF inválido",
  });

/**
 * Schema de validação para email
 */
export const emailSchema = z
  .string()
  .email("Email inválido")
  .toLowerCase()
  .trim();

/**
 * Schema completo para cadastro de cliente
 */
export const ClienteSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo")
    .trim(),
  
  telefone: telefoneBR,
  
  cpf: cpfSchema.optional(),
  
  email: emailSchema.optional(),
  
  consentimentoLgpd: z.literal(true, {
    errorMap: () => ({ message: "É necessário consentir com os termos da LGPD" }),
  }),
  
  observacoes: z.string().max(500, "Observações muito longas").optional(),
  
  dataNascimento: z.coerce.date().optional(),
});

/**
 * Schema para atualização de cliente (todos campos opcionais exceto consentimento)
 */
export const ClienteUpdateSchema = ClienteSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

/**
 * Type inference dos schemas
 */
export type Cliente = z.infer<typeof ClienteSchema>;
export type ClienteUpdate = z.infer<typeof ClienteUpdateSchema>;
