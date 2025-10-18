import { z } from "zod";

/**
 * Schema de validação para serviço
 */
export const ServicoSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo")
    .trim(),
  
  descricao: z
    .string()
    .max(500, "Descrição muito longa")
    .optional(),
  
  duracao: z
    .number()
    .int("Duração deve ser um número inteiro")
    .positive("Duração deve ser positiva")
    .max(480, "Duração máxima de 8 horas"),
  
  preco: z
    .number()
    .nonnegative("Preço não pode ser negativo")
    .multipleOf(0.01, "Preço deve ter no máximo 2 casas decimais"),
  
  categoria: z
    .string()
    .min(2, "Categoria muito curta")
    .max(50, "Categoria muito longa")
    .optional(),
  
  ativo: z.boolean().default(true),
  
  cor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida. Use formato hexadecimal (#RRGGBB)")
    .optional(),
  
  permiteOnlineBooking: z.boolean().default(true),
  
  intervaloAposServico: z
    .number()
    .int("Intervalo deve ser um número inteiro")
    .nonnegative("Intervalo não pode ser negativo")
    .max(120, "Intervalo máximo de 2 horas")
    .default(0),
});

/**
 * Schema para atualização de serviço
 */
export const ServicoUpdateSchema = ServicoSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

/**
 * Type inference dos schemas
 */
export type Servico = z.infer<typeof ServicoSchema>;
export type ServicoUpdate = z.infer<typeof ServicoUpdateSchema>;
