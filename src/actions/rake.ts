'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCompetencia } from '@/lib/competencia'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface RakeEntry {
  id: string
  date: string
  chips: number
  competencia: string | null
  notes: string | null
}

export async function listarRakePorMes(ano: number, mes: number) {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, chips, competencia, notes')
    .eq('operation_type', 'RAKE')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('Erro ao listar rake:', error)
    return []
  }

  return data as RakeEntry[]
}

export async function getRakeDoMes(ano: number, mes: number) {
  const supabase = await createClient() as SupabaseClient

  const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE')
    .gte('date', startDate)
    .lt('date', endDate)

  const total = (data || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  return total
}

export async function getRakeAcumulado() {
  const supabase = await createClient() as SupabaseClient

  const { data } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE')

  const total = (data || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  return total
}

interface NovoRakeData {
  date: string
  chips: number
  notes?: string
}

export async function criarRake(data: NovoRakeData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const dateObj = new Date(data.date + 'T12:00:00')
    const competencia = getCompetencia(dateObj)

    const { error } = await supabase
      .from('transactions')
      .insert({
        date: data.date,
        operation_type: 'RAKE',
        type: 'LOG',
        chips: data.chips,
        competencia,
        reconciled: true,
        notes: data.notes || null,
        created_by: user.id,
      })

    if (error) throw error

    // Registrar no audit_log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: `Rake registrado: ${data.chips} fichas em ${data.date}`,
      table_name: 'transactions',
      new_value: data,
    })

    revalidatePath('/operacional/rake')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar rake:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar rake',
    }
  }
}

export async function editarRake(id: string, data: { chips: number; notes?: string }) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        chips: data.chips,
        notes: data.notes || null,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/operacional/rake')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Erro ao editar rake:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao editar rake',
    }
  }
}

export async function excluirRake(id: string) {
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
      .eq('operation_type', 'RAKE')

    if (error) throw error

    revalidatePath('/operacional/rake')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir rake:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir rake',
    }
  }
}
