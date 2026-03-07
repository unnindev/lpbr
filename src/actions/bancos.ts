'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface BankWithBalance {
  id: string
  name: string
  initial_balance: number
  is_active: boolean
  saldo: number
}

export async function listarBancos() {
  const supabase = await createClient() as SupabaseClient

  const { data: banks, error } = await supabase
    .from('banks')
    .select('id, name, initial_balance, is_active')
    .order('name')

  if (error) {
    console.error('Erro ao listar bancos:', error)
    return []
  }

  // Calcular saldo de cada banco
  const result: BankWithBalance[] = []
  for (const bank of banks || []) {
    const { data: saldo } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id })
    result.push({
      ...bank,
      saldo: saldo || 0,
    })
  }

  return result
}

export async function getTotalBancos() {
  const supabase = await createClient() as SupabaseClient

  const { data: banks } = await supabase
    .from('banks')
    .select('id')
    .eq('is_active', true)

  let total = 0
  for (const bank of banks || []) {
    const { data: saldo } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id })
    total += saldo || 0
  }

  return total
}

interface NovoBancoData {
  name: string
  initial_balance?: number
}

export async function criarBanco(data: NovoBancoData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  // Verificar permissão
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['CODE', 'ADMIN'].includes(userData.role)) {
    return { success: false, error: 'Sem permissão para criar bancos' }
  }

  try {
    const { error } = await supabase
      .from('banks')
      .insert({
        name: data.name,
        initial_balance: data.initial_balance || 0,
      })

    if (error) throw error

    revalidatePath('/financeiro/bancos')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar banco:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar banco',
    }
  }
}

export async function editarBanco(id: string, data: { name: string }) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('banks')
      .update({ name: data.name })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/financeiro/bancos')
    return { success: true }
  } catch (error) {
    console.error('Erro ao editar banco:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao editar banco',
    }
  }
}

export async function toggleBancoAtivo(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Buscar estado atual
    const { data: current } = await supabase
      .from('banks')
      .select('is_active')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('banks')
      .update({ is_active: !current?.is_active })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/financeiro/bancos')
    return { success: true }
  } catch (error) {
    console.error('Erro ao alterar status do banco:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status',
    }
  }
}
