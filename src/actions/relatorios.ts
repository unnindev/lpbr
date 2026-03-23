'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface EstatisticasOrigem {
  chippix: {
    quantidade: number
    fichasEnviadas: number
    fichasRecebidas: number
    totalFichas: number
  }
  manual: {
    quantidade: number
    fichasEnviadas: number
    fichasRecebidas: number
    totalFichas: number
  }
  percentualChippix: number
  percentualManual: number
}

export async function getEstatisticasPorOrigem(ano: number, mes: number): Promise<EstatisticasOrigem> {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  // Buscar transações de compra e saque de fichas do período
  const { data: transactions } = await supabase
    .from('transactions')
    .select('origem, operation_type, chips')
    .in('operation_type', ['COMPRA_FICHAS', 'SAQUE_FICHAS'])
    .gte('date', startDate)
    .lt('date', endDate)
    .eq('reconciled', true)

  const txs = transactions || []

  // Calcular estatísticas para ChipPix
  const chippixTxs = txs.filter((t: { origem: string }) => t.origem === 'CHIPPIX')
  const chippixEnviadas = chippixTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'COMPRA_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const chippixRecebidas = chippixTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'SAQUE_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Calcular estatísticas para Manual
  const manualTxs = txs.filter((t: { origem: string }) => t.origem !== 'CHIPPIX')
  const manualEnviadas = manualTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'COMPRA_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const manualRecebidas = manualTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'SAQUE_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const totalTransacoes = txs.length
  const percentualChippix = totalTransacoes > 0 ? (chippixTxs.length / totalTransacoes) * 100 : 0
  const percentualManual = totalTransacoes > 0 ? (manualTxs.length / totalTransacoes) * 100 : 0

  return {
    chippix: {
      quantidade: chippixTxs.length,
      fichasEnviadas: chippixEnviadas,
      fichasRecebidas: chippixRecebidas,
      totalFichas: chippixEnviadas + chippixRecebidas,
    },
    manual: {
      quantidade: manualTxs.length,
      fichasEnviadas: manualEnviadas,
      fichasRecebidas: manualRecebidas,
      totalFichas: manualEnviadas + manualRecebidas,
    },
    percentualChippix,
    percentualManual,
  }
}

interface EstatisticasAcumuladas {
  chippix: {
    quantidade: number
    totalFichas: number
  }
  manual: {
    quantidade: number
    totalFichas: number
  }
  percentualChippix: number
}

export async function getEstatisticasAcumuladas(): Promise<EstatisticasAcumuladas> {
  const supabase = await createClient() as SupabaseClient

  // Buscar todas as transações de compra e saque de fichas
  const { data: transactions } = await supabase
    .from('transactions')
    .select('origem, chips')
    .in('operation_type', ['COMPRA_FICHAS', 'SAQUE_FICHAS'])
    .eq('reconciled', true)

  const txs = transactions || []

  const chippixTxs = txs.filter((t: { origem: string }) => t.origem === 'CHIPPIX')
  const chippixTotal = chippixTxs.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const manualTxs = txs.filter((t: { origem: string }) => t.origem !== 'CHIPPIX')
  const manualTotal = manualTxs.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const totalTransacoes = txs.length
  const percentualChippix = totalTransacoes > 0 ? (chippixTxs.length / totalTransacoes) * 100 : 0

  return {
    chippix: {
      quantidade: chippixTxs.length,
      totalFichas: chippixTotal,
    },
    manual: {
      quantidade: manualTxs.length,
      totalFichas: manualTotal,
    },
    percentualChippix,
  }
}
