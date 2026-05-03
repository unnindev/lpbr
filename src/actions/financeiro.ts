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

  // Receitas: Rake PPPoker (em chips) + Rake Suprema (em R$)
  const { data: rakeData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE')
    .gte('date', startDate)
    .lt('date', endDate)

  const rakePPPoker = (rakeData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  const { data: rakeSupremaData } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'RAKE_SUPREMA')
    .gte('date', startDate)
    .lt('date', endDate)

  const rakeSuprema = (rakeSupremaData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Despesas: apenas custos operacionais
  const { data: custosData } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'CUSTO_DESPESA')
    .gte('date', startDate)
    .lt('date', endDate)

  const custos = (custosData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  const totalReceitas = rakePPPoker + rakeSuprema
  const totalDespesas = custos
  const resultadoMes = totalReceitas - totalDespesas

  return {
    receitas: {
      rakePPPoker,
      rakeSuprema,
      total: totalReceitas,
    },
    despesas: {
      custos,
      total: totalDespesas,
    },
    resultadoMes,
  }
}

export interface ResultadoAnualMes {
  mes: number
  rakePPPoker: number
  rakeSuprema: number
  custos: number
}

export async function getResultadoAnual(ano: number): Promise<ResultadoAnualMes[]> {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-01-01`
  const endDate = `${ano + 1}-01-01`

  const [{ data: rake }, { data: rakeSup }, { data: custos }] = await Promise.all([
    supabase.from('transactions').select('date, chips').eq('operation_type', 'RAKE').gte('date', startDate).lt('date', endDate),
    supabase.from('transactions').select('date, value').eq('operation_type', 'RAKE_SUPREMA').gte('date', startDate).lt('date', endDate),
    supabase.from('transactions').select('date, value').eq('operation_type', 'CUSTO_DESPESA').gte('date', startDate).lt('date', endDate),
  ])

  const meses: ResultadoAnualMes[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    rakePPPoker: 0,
    rakeSuprema: 0,
    custos: 0,
  }))

  for (const r of rake || []) {
    const m = parseInt((r.date as string).slice(5, 7), 10) - 1
    if (m >= 0 && m < 12) meses[m].rakePPPoker += parseFloat(r.chips) || 0
  }
  for (const r of rakeSup || []) {
    const m = parseInt((r.date as string).slice(5, 7), 10) - 1
    if (m >= 0 && m < 12) meses[m].rakeSuprema += parseFloat(r.value) || 0
  }
  for (const r of custos || []) {
    const m = parseInt((r.date as string).slice(5, 7), 10) - 1
    if (m >= 0 && m < 12) meses[m].custos += parseFloat(r.value) || 0
  }

  return meses
}

export async function getResultadoAcumulado() {
  const supabase = await createClient() as SupabaseClient

  const [{ data: rakeData }, { data: rakeSupData }, { data: custosData }] = await Promise.all([
    supabase.from('transactions').select('chips').eq('operation_type', 'RAKE'),
    supabase.from('transactions').select('value').eq('operation_type', 'RAKE_SUPREMA'),
    supabase.from('transactions').select('value').eq('operation_type', 'CUSTO_DESPESA'),
  ])

  const rake = (rakeData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const rakeSuprema = (rakeSupData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)
  const custos = (custosData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  return rake + rakeSuprema - custos
}
