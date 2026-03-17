/**
 * Taxa fixa do ChipPix por transação
 */
export const CHIPPIX_FEE = 0.5

/**
 * Calcula o valor em reais de uma transação via ChipPix
 *
 * Regra do ChipPix:
 * - Depósito (jogador compra fichas): sem taxa, fichas = reais
 * - Saque (jogador saca fichas): jogador entrega X fichas, mas conta ChipPix paga (X + 0,50)
 *
 * @param chips - Valor em fichas informado pelo operador
 * @param direcao - 'deposito' quando jogador compra fichas, 'saque' quando jogador saca fichas
 * @returns Valor real em reais que entra/sai do banco ChipPix
 */
export function calcularValorChippix(
  chips: number,
  direcao: 'deposito' | 'saque'
): number {
  if (direcao === 'deposito') {
    // Depósito: sem taxa (ChipPix não cobra na entrada)
    return chips
  } else {
    // Clube paga mais (jogador pediu X, mas ChipPix cobra a taxa do clube)
    return chips + CHIPPIX_FEE
  }
}

/**
 * Calcula o valor em fichas a partir do valor em reais e direção
 *
 * @param value - Valor em reais
 * @param direcao - 'deposito' ou 'saque'
 * @returns Valor em fichas
 */
export function calcularFichasChippix(
  value: number,
  direcao: 'deposito' | 'saque'
): number {
  if (direcao === 'deposito') {
    // Depósito: sem taxa
    return value
  } else {
    return value - CHIPPIX_FEE
  }
}
