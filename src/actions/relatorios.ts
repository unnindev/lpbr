'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface CategoriaEstatisticas {
  quantidade: number
  fichasEnviadas: number
  fichasRecebidas: number
  totalFichas: number
}

interface EstatisticasSegmentadas {
  chippix: CategoriaEstatisticas
  manual: CategoriaEstatisticas
  ranking: CategoriaEstatisticas
  rakeSemanal: CategoriaEstatisticas
  total: number
}

export async function getEstatisticasSegmentadas(ano: number, mes: number): Promise<EstatisticasSegmentadas> {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  // Buscar todas as transações relevantes do período
  const { data: transactions } = await supabase
    .from('transactions')
    .select('origem, operation_type, chips')
    .in('operation_type', [
      'COMPRA_FICHAS',
      'SAQUE_FICHAS',
      'RANKING_COLETA',
      'RANKING_PAGAMENTO_FICHAS',
      'RANKING_PAGAMENTO_DINHEIRO',
      'RAKE_AGENTE',
      'CASHBACK_FICHAS',
      'CASHBACK_DINHEIRO',
      'CASHBACK_PAGAMENTO_DIVIDA'
    ])
    .gte('date', startDate)
    .lt('date', endDate)
    .eq('reconciled', true)

  const txs = transactions || []

  // ChipPix: transações de compra/saque com origem CHIPPIX
  const chippixTxs = txs.filter((t: { origem: string; operation_type: string }) =>
    t.origem === 'CHIPPIX' && ['COMPRA_FICHAS', 'SAQUE_FICHAS'].includes(t.operation_type)
  )
  const chippixEnviadas = chippixTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'COMPRA_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const chippixRecebidas = chippixTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'SAQUE_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Manual: transações de compra/saque com origem diferente de CHIPPIX
  const manualTxs = txs.filter((t: { origem: string; operation_type: string }) =>
    t.origem !== 'CHIPPIX' && ['COMPRA_FICHAS', 'SAQUE_FICHAS'].includes(t.operation_type)
  )
  const manualEnviadas = manualTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'COMPRA_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const manualRecebidas = manualTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'SAQUE_FICHAS')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Ranking: transações de ranking
  const rankingTxs = txs.filter((t: { operation_type: string }) =>
    ['RANKING_COLETA', 'RANKING_PAGAMENTO_FICHAS', 'RANKING_PAGAMENTO_DINHEIRO'].includes(t.operation_type)
  )
  const rankingEnviadas = rankingTxs
    .filter((t: { operation_type: string }) => ['RANKING_PAGAMENTO_FICHAS', 'RANKING_PAGAMENTO_DINHEIRO'].includes(t.operation_type))
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const rankingRecebidas = rankingTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'RANKING_COLETA')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Rake Semanal: transações de rake agente e cashback
  const rakeSemanalTxs = txs.filter((t: { operation_type: string }) =>
    ['RAKE_AGENTE', 'CASHBACK_FICHAS', 'CASHBACK_DINHEIRO', 'CASHBACK_PAGAMENTO_DIVIDA'].includes(t.operation_type)
  )
  const rakeSemanalEnviadas = rakeSemanalTxs
    .filter((t: { operation_type: string }) => ['CASHBACK_FICHAS', 'CASHBACK_DINHEIRO', 'CASHBACK_PAGAMENTO_DIVIDA'].includes(t.operation_type))
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const rakeSemanalRecebidas = rakeSemanalTxs
    .filter((t: { operation_type: string }) => t.operation_type === 'RAKE_AGENTE')
    .reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const total = chippixTxs.length + manualTxs.length + rankingTxs.length + rakeSemanalTxs.length

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
    ranking: {
      quantidade: rankingTxs.length,
      fichasEnviadas: rankingEnviadas,
      fichasRecebidas: rankingRecebidas,
      totalFichas: rankingEnviadas + rankingRecebidas,
    },
    rakeSemanal: {
      quantidade: rakeSemanalTxs.length,
      fichasEnviadas: rakeSemanalEnviadas,
      fichasRecebidas: rakeSemanalRecebidas,
      totalFichas: rakeSemanalEnviadas + rakeSemanalRecebidas,
    },
    total,
  }
}

interface CategoriaAcumulada {
  quantidade: number
  totalFichas: number
}

interface EstatisticasAcumuladasSegmentadas {
  chippix: CategoriaAcumulada
  manual: CategoriaAcumulada
  ranking: CategoriaAcumulada
  rakeSemanal: CategoriaAcumulada
  total: number
}

export async function getEstatisticasAcumuladasSegmentadas(): Promise<EstatisticasAcumuladasSegmentadas> {
  const supabase = await createClient() as SupabaseClient

  // Buscar todas as transações relevantes
  const { data: transactions } = await supabase
    .from('transactions')
    .select('origem, operation_type, chips')
    .in('operation_type', [
      'COMPRA_FICHAS',
      'SAQUE_FICHAS',
      'RANKING_COLETA',
      'RANKING_PAGAMENTO_FICHAS',
      'RANKING_PAGAMENTO_DINHEIRO',
      'RAKE_AGENTE',
      'CASHBACK_FICHAS',
      'CASHBACK_DINHEIRO',
      'CASHBACK_PAGAMENTO_DIVIDA'
    ])
    .eq('reconciled', true)

  const txs = transactions || []

  // ChipPix
  const chippixTxs = txs.filter((t: { origem: string; operation_type: string }) =>
    t.origem === 'CHIPPIX' && ['COMPRA_FICHAS', 'SAQUE_FICHAS'].includes(t.operation_type)
  )
  const chippixTotal = chippixTxs.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Manual
  const manualTxs = txs.filter((t: { origem: string; operation_type: string }) =>
    t.origem !== 'CHIPPIX' && ['COMPRA_FICHAS', 'SAQUE_FICHAS'].includes(t.operation_type)
  )
  const manualTotal = manualTxs.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Ranking
  const rankingTxs = txs.filter((t: { operation_type: string }) =>
    ['RANKING_COLETA', 'RANKING_PAGAMENTO_FICHAS', 'RANKING_PAGAMENTO_DINHEIRO'].includes(t.operation_type)
  )
  const rankingTotal = rankingTxs.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Rake Semanal
  const rakeSemanalTxs = txs.filter((t: { operation_type: string }) =>
    ['RAKE_AGENTE', 'CASHBACK_FICHAS', 'CASHBACK_DINHEIRO', 'CASHBACK_PAGAMENTO_DIVIDA'].includes(t.operation_type)
  )
  const rakeSemanalTotal = rakeSemanalTxs.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const total = chippixTxs.length + manualTxs.length + rankingTxs.length + rakeSemanalTxs.length

  return {
    chippix: {
      quantidade: chippixTxs.length,
      totalFichas: chippixTotal,
    },
    manual: {
      quantidade: manualTxs.length,
      totalFichas: manualTotal,
    },
    ranking: {
      quantidade: rankingTxs.length,
      totalFichas: rankingTotal,
    },
    rakeSemanal: {
      quantidade: rakeSemanalTxs.length,
      totalFichas: rakeSemanalTotal,
    },
    total,
  }
}
