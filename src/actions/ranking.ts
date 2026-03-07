'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface RankingTransaction {
  id: string
  date: string
  operation_type: string
  chips: number | null
  value: number | null
  player: {
    id: string
    nick: string
    name: string
  } | null
}

export async function listarRankingPorMes(ano: number, mes: number) {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      date,
      operation_type,
      chips,
      value,
      player:players(id, nick, name)
    `)
    .in('operation_type', ['RANKING_COLETA', 'RANKING_PAGAMENTO_FICHAS', 'RANKING_PAGAMENTO_DINHEIRO'])
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('Erro ao listar ranking:', error)
    return []
  }

  return data as RankingTransaction[]
}

export async function getRankingStats(ano: number, mes: number) {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  // Fichas coletadas no mês
  const { data: coletas } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RANKING_COLETA')
    .gte('date', startDate)
    .lt('date', endDate)

  const fichasColetadas = (coletas || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Prêmios em fichas no mês
  const { data: premiosFichas } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RANKING_PAGAMENTO_FICHAS')
    .gte('date', startDate)
    .lt('date', endDate)

  const totalPremiosFichas = (premiosFichas || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Prêmios em dinheiro no mês
  const { data: premiosDinheiro } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'RANKING_PAGAMENTO_DINHEIRO')
    .gte('date', startDate)
    .lt('date', endDate)

  const totalPremiosDinheiro = (premiosDinheiro || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Saldo ranking acumulado (via RPC)
  const { data: saldoRanking } = await supabase.rpc('get_saldo_ranking')

  return {
    fichasColetadas,
    premiosFichas: totalPremiosFichas,
    premiosDinheiro: totalPremiosDinheiro,
    saldoRanking: saldoRanking || 0,
  }
}

interface ColetaItem {
  playerId: string
  premio: number
  percentual: number
}

export async function confirmarColetas(data: { date: string; coletas: ColetaItem[] }) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    for (const coleta of data.coletas) {
      const chips = coleta.premio * (coleta.percentual / 100)

      // Criar transação de coleta
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          date: data.date,
          operation_type: 'RANKING_COLETA',
          type: 'LOG',
          chips,
          player_id: coleta.playerId,
          reconciled: true,
          notes: `Coleta ranking: ${coleta.percentual}% de ${coleta.premio} fichas`,
          created_by: user.id,
        })

      if (txError) throw txError

      // Criar ranking_transaction
      const { error: rtError } = await supabase
        .from('ranking_transactions')
        .insert({
          type: 'COLETA',
          chips,
          player_id: coleta.playerId,
          total_prize: coleta.premio,
          pct_collected: coleta.percentual,
          created_by: user.id,
        })

      if (rtError) throw rtError
    }

    revalidatePath('/ranking')
    revalidatePath('/ranking/calculadora')
    return { success: true }
  } catch (error) {
    console.error('Erro ao confirmar coletas:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao confirmar coletas',
    }
  }
}

interface PagamentoItem {
  playerId: string
  modalidade: 'FICHAS' | 'DINHEIRO' | 'ABATE_DIVIDA'
  valor: number
  bankId?: string
}

export async function confirmarPagamentos(data: { date: string; pagamentos: PagamentoItem[] }) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    for (const pag of data.pagamentos) {
      if (pag.modalidade === 'FICHAS') {
        const { error } = await supabase
          .from('transactions')
          .insert({
            date: data.date,
            operation_type: 'RANKING_PAGAMENTO_FICHAS',
            type: 'LOG',
            chips: pag.valor,
            player_id: pag.playerId,
            reconciled: true,
            notes: 'Pagamento ranking em fichas',
            created_by: user.id,
          })

        if (error) throw error
      } else if (pag.modalidade === 'DINHEIRO') {
        if (!pag.bankId) {
          return { success: false, error: 'Banco é obrigatório para pagamento em dinheiro' }
        }

        const { error } = await supabase
          .from('transactions')
          .insert({
            date: data.date,
            operation_type: 'RANKING_PAGAMENTO_DINHEIRO',
            type: 'FINANCIAL',
            value: pag.valor,
            player_id: pag.playerId,
            bank_id: pag.bankId,
            reconciled: true,
            notes: 'Pagamento ranking em dinheiro',
            created_by: user.id,
          })

        if (error) throw error
      } else if (pag.modalidade === 'ABATE_DIVIDA') {
        // Abater dívida do jogador
        const { error } = await supabase
          .from('transactions')
          .insert({
            date: data.date,
            operation_type: 'CASHBACK_PAGAMENTO_DIVIDA',
            type: 'CONTROL',
            value: pag.valor,
            player_id: pag.playerId,
            reconciled: true,
            notes: 'Abate de dívida via ranking',
            created_by: user.id,
          })

        if (error) throw error
      }
    }

    revalidatePath('/ranking')
    revalidatePath('/ranking/calculadora')
    return { success: true }
  } catch (error) {
    console.error('Erro ao confirmar pagamentos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao confirmar pagamentos',
    }
  }
}
