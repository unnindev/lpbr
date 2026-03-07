/**
 * Gera a string de competência a partir de uma data
 * Formato: "SEM1 MAR/2026"
 */
export function getCompetencia(date: Date): string {
  const weekOfMonth = Math.ceil(date.getDate() / 7)
  const month = date
    .toLocaleString('pt-BR', { month: 'short' })
    .toUpperCase()
    .replace('.', '')
  const year = date.getFullYear()
  return `SEM${weekOfMonth} ${month}/${year}`
}

/**
 * Retorna o número da semana do mês (1-5)
 */
export function getWeekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7)
}

/**
 * Retorna as datas de início e fim de uma semana específica
 */
export function getWeekDates(
  year: number,
  weekNumber: number
): { start: Date; end: Date } {
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfWeek = firstDayOfYear.getDay()
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek

  const firstMonday = new Date(year, 0, 1 + daysToMonday)
  const weekStart = new Date(firstMonday)
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return { start: weekStart, end: weekEnd }
}

/**
 * Retorna o número da semana do ano (ISO week)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Formata o label da semana para exibição
 * Ex: "02/03 - 08/03/2026 (Semana 10/2026)"
 */
export function formatWeekLabel(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const endStr = end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const weekNum = getWeekNumber(start)
  const year = start.getFullYear()

  return `${startStr} - ${endStr} (Semana ${weekNum}/${year})`
}
