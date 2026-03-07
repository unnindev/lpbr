/**
 * Formata um valor numérico como moeda brasileira (R$)
 * Arredondamento apenas no display - nunca em cálculos intermediários
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata um valor numérico como fichas (sem símbolo de moeda)
 */
export function formatChips(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata uma data no padrão brasileiro (dd/mm/yyyy)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

/**
 * Formata uma data com hora no padrão brasileiro (dd/mm/yyyy HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Formata número para exibição (sem formatação de moeda)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Converte string de moeda brasileira para número
 */
export function parseCurrency(value: string): number {
  return parseFloat(
    value
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  )
}
