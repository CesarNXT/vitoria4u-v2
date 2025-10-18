import { z } from "zod";

/**
 * Schema de validação para planos de assinatura
 */
export const PlanoAssinaturaSchema = z.object({
  nome: z.enum(["starter", "professional", "enterprise"], {
    errorMap: () => ({ message: "Plano inválido" }),
  }),
  
  valor: z
    .number()
    .positive("Valor deve ser positivo")
    .multipleOf(0.01, "Valor deve ter no máximo 2 casas decimais"),
  
  periodicidade: z.enum(["mensal", "trimestral", "anual"]),
  
  limites: z.object({
    agendamentosMes: z.number().int().positive().optional(),
    usuarios: z.number().int().positive(),
    profissionais: z.number().int().positive(),
    servicos: z.number().int().positive(),
    clientes: z.number().int().positive().optional(),
    whatsappMensagens: z.number().int().positive().optional(),
  }),
  
  recursos: z.array(z.string()).default([]),
});

/**
 * Schema para upgrade/downgrade de plano
 */
export const MudancaPlanoSchema = z.object({
  planoAtual: PlanoAssinaturaSchema.shape.nome,
  planoNovo: PlanoAssinaturaSchema.shape.nome,
  aplicarProrata: z.boolean().default(true),
  dataEfetivacao: z.coerce.date().optional(), // Se não informado, aplica imediatamente
});

/**
 * Schema para cálculo de prorateamento
 */
export const CalculoProRataSchema = z.object({
  valorPlano: z.number().positive(),
  diasCiclo: z.number().int().positive().max(366),
  diasUsados: z.number().int().nonnegative(),
});

/**
 * Schema para pagamento
 */
export const PagamentoSchema = z.object({
  tipo: z.enum(["boleto", "cartao_credito", "pix", "dinheiro"]),
  
  valor: z
    .number()
    .positive("Valor deve ser positivo")
    .multipleOf(0.01, "Valor deve ter no máximo 2 casas decimais"),
  
  status: z.enum(["pendente", "aprovado", "recusado", "cancelado", "reembolsado"]),
  
  assinaturaId: z.string().uuid("ID da assinatura inválido").optional(),
  
  agendamentoId: z.string().uuid("ID do agendamento inválido").optional(),
  
  metodoPagamentoId: z.string().optional(), // ID do Mercado Pago/Stripe
  
  retentativas: z.number().int().nonnegative().default(0),
  
  maxRetentativas: z.number().int().positive().default(3),
  
  proximaRetentativa: z.coerce.date().optional(),
});

/**
 * Type inference dos schemas
 */
export type PlanoAssinatura = z.infer<typeof PlanoAssinaturaSchema>;
export type MudancaPlano = z.infer<typeof MudancaPlanoSchema>;
export type CalculoProRata = z.infer<typeof CalculoProRataSchema>;
export type Pagamento = z.infer<typeof PagamentoSchema>;
