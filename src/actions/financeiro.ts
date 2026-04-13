'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface CustoEntry {
  id: string
  date: string
  value: number
  notes: string | null
  bank: {
    id: string
    name: string
  } | null
}

export async function listarCustosPorMes(ano: number, mes: number) {
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
      value,
      notes,
      bank:banks(id, name)
    `)
    .eq('operation_type', 'CUSTO_DESPESA')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('Erro ao listar custos:', error)
    return []
  }

  return data as CustoEntry[]
}

export async function getCustosDoMes(ano: number, mes: number) {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data, count } = await supabase
    .from('transactions')
    .select('value', { count: 'exact' })
    .eq('operation_type', 'CUSTO_DESPESA')
    .gte('date', startDate)
    .lt('date', endDate)

  const total = (data || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)
  return { total, count: count || 0 }
}

interface NovoCustoData {
  date: string
  descricao: string
  bankId: string
  value: number
}

export async function criarCusto(data: NovoCustoData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .insert({
        date: data.date,
        operation_type: 'CUSTO_DESPESA',
        type: 'FINANCIAL',
        value: data.value,
        bank_id: data.bankId,
        notes: data.descricao,
        reconciled: true,
        created_by: user.id,
      })

    if (error) throw error

    revalidatePath('/financeiro/custos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar custo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar custo',
    }
  }
}

export async function excluirCusto(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('operation_type', 'CUSTO_DESPESA')

    if (error) throw error

    revalidatePath('/financeiro/custos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir custo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir custo',
    }
  }
}

// Resultado financeiro
export async function getResultadoMensal(ano: number, mes: number) {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  // Receitas
  // Rake
  const { data: rakeData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE')
    .gte('date', startDate)
    .lt('date', endDate)

  const rake = (rakeData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Ranking coletas
  const { data: rankingColetaData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RANKING_COLETA')
    .gte('date', startDate)
    .lt('date', endDate)

  const rankingColeta = (rankingColetaData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Despesas
  // Custos operacionais
  const { data: custosData } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'CUSTO_DESPESA')
    .gte('date', startDate)
    .lt('date', endDate)

  const custos = (custosData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Ranking pagamentos (fichas + dinheiro)
  const { data: rankingPagtoFichas } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RANKING_PAGAMENTO_FICHAS')
    .gte('date', startDate)
    .lt('date', endDate)

  const { data: rankingPagtoDinheiro } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'RANKING_PAGAMENTO_DINHEIRO')
    .gte('date', startDate)
    .lt('date', endDate)

  const rankingPremios =
    (rankingPagtoFichas || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0) +
    (rankingPagtoDinheiro || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Cashback agentes
  const { data: cashbackData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE_AGENTE')
    .gte('date', startDate)
    .lt('date', endDate)

  const cashbackAgentes = (cashbackData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const totalReceitas = rake + rankingColeta
  const totalDespesas = custos + rankingPremios + cashbackAgentes
  const resultadoMes = totalReceitas - totalDespesas

  return {
    receitas: {
      rake,
      rankingColeta,
      total: totalReceitas,
    },
    despesas: {
      custos,
      rankingPremios,
      cashbackAgentes,
      total: totalDespesas,
    },
    resultadoMes,
  }
}

export async function getResultadoAcumulado() {
  const supabase = await createClient() as SupabaseClient

  // Rake total
  const { data: rakeData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE')

  const rake = (rakeData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Ranking coletas total
  const { data: rankingColetaData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RANKING_COLETA')

  const rankingColeta = (rankingColetaData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Custos totais
  const { data: custosData } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'CUSTO_DESPESA')

  const custos = (custosData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Ranking pagamentos totais
  const { data: rankingPagtoFichas } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RANKING_PAGAMENTO_FICHAS')

  const { data: rankingPagtoDinheiro } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'RANKING_PAGAMENTO_DINHEIRO')

  const rankingPremios =
    (rankingPagtoFichas || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0) +
    (rankingPagtoDinheiro || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Cashback agentes total
  const { data: cashbackData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE_AGENTE')

  const cashbackAgentes = (cashbackData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const totalReceitas = rake + rankingColeta
  const totalDespesas = custos + rankingPremios + cashbackAgentes

  return totalReceitas - totalDespesas
}
