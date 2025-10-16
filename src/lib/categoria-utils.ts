/**
 * Utilitários para categorias de negócio
 */

// Categorias que são clínicas e podem usar sistema de planos de saúde
const CATEGORIAS_CLINICAS = [
  'ClinicaDeFisioterapia',
  'ClinicaMedica',
  'ClinicaNutricionista',
  'ClinicaOdontologica',
  'ClinicaPsicologica',
];

/**
 * Verifica se uma categoria é uma clínica (tem acesso ao sistema de planos de saúde)
 */
export function isCategoriaClinica(categoria: string | undefined): boolean {
  if (!categoria) return false;
  return CATEGORIAS_CLINICAS.includes(categoria);
}

/**
 * Lista de todas as categorias clínicas
 */
export function getCategoriasClinicas(): string[] {
  return [...CATEGORIAS_CLINICAS];
}
