import { CalculoProRataSchema, type CalculoProRata } from "@/schemas/financeiro";

/**
 * Calcula o valor prorateado de um plano baseado nos dias usados
 * @param params - Parâmetros para cálculo
 * @returns Valor prorateado com 2 casas decimais
 */
export function calcularProrata(params: CalculoProRata): number {
  // Valida entrada com Zod
  const validated = CalculoProRataSchema.parse(params);
  
  const { valorPlano, diasCiclo, diasUsados } = validated;
  
  // Valor por dia
  const valorDia = valorPlano / diasCiclo;
  
  // Dias restantes
  const diasRestantes = diasCiclo - diasUsados;
  
  // Valor prorateado arredondado para 2 casas decimais
  return Math.round(valorDia * diasRestantes * 100) / 100;
}

/**
 * Calcula a diferença de valor entre planos considerando prorateamento
 */
export function calcularDiferencaPlanos(
  planoAtualValor: number,
  planoNovoValor: number,
  diasCiclo: number,
  diasUsados: number
): number {
  const creditoRestante = calcularProrata({
    valorPlano: planoAtualValor,
    diasCiclo,
    diasUsados,
  });
  
  const valorNovoProRata = calcularProrata({
    valorPlano: planoNovoValor,
    diasCiclo,
    diasUsados: 0, // Novo plano, dias restantes = ciclo completo
  });
  
  return valorNovoProRata - creditoRestante;
}

/**
 * Formata valor BRL para exibição
 */
export function formatarValorBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Calcula próxima data de cobrança considerando periodicidade
 */
export function calcularProximaCobranca(
  dataInicio: Date,
  periodicidade: "mensal" | "trimestral" | "anual"
): Date {
  const proxima = new Date(dataInicio);
  
  switch (periodicidade) {
    case "mensal":
      proxima.setMonth(proxima.getMonth() + 1);
      break;
    case "trimestral":
      proxima.setMonth(proxima.getMonth() + 3);
      break;
    case "anual":
      proxima.setFullYear(proxima.getFullYear() + 1);
      break;
  }
  
  return proxima;
}
