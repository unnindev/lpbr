'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularValorChippix } from '@/lib/chippix'
import { getCompetencia } from '@/lib/competencia'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface NovoLogData {
  tipo: 'ENVIO' | 'RECEBIMENTO'
  playerId: string
  chips: number
  origem: 'MANUAL' | 'CHIPPIX'
  date: string
  notes?: string
}

export async function criarLog(data: NovoLogData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Calcular value se ChipPix
    let value: number | null = null
    if (data.origem === 'CHIPPIX') {
      const direcao = data.tipo === 'ENVIO' ? 'deposito' : 'saque'
      value = calcularValorChippix(data.chips, direcao)
    }

    // Gerar competência
    const competencia = getCompetencia(new Date(data.date))

    // Criar transação
    // operation_type será definido na conciliação
    // Por enquanto, marcamos o "sentido" no notes para referência
    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        date: data.date,
        operation_type: null, // pendente de conciliação
        type: 'LOG',
        chips: data.chips,
        value,
        origem: data.origem,
        player_id: data.playerId,
        reconciled: false,
        competencia,
        notes: data.notes ? `[${data.tipo}] ${data.notes}` : `[${data.tipo}]`,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Registrar no audit_log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: `Novo log criado: ${data.tipo} ${data.chips} fichas`,
      table_name: 'transactions',
      record_id: tx.id,
      new_value: tx,
    })

    revalidatePath('/operacional/log')

    return { success: true, data: tx }
  } catch (error) {
    console.error('Erro ao criar log:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar log'
    }
  }
}

export async function listarLogsPorData(date: string) {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      player:players(id, club_id, nick, name)
    `)
    .eq('type', 'LOG')
    .eq('date', date)
    .or('operation_type.is.null,operation_type.neq.RAKE')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao listar logs:', error)
    return []
  }

  return data || []
}

export async function getFichasCirculacao() {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase.rpc('get_fichas_circulacao')

  if (error) {
    console.error('Erro ao buscar fichas em circulação:', error)
    return 0
  }

  return data || 0
}

export async function excluirLog(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Buscar o log antes de excluir para o audit
    const { data: log } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (!log) {
      return { success: false, error: 'Log não encontrado' }
    }

    // Verificar se já foi conciliado
    if (log.reconciled) {
      return { success: false, error: 'Não é possível excluir um log já conciliado' }
    }

    // Excluir
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Registrar no audit_log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: `Log excluído: ${log.chips} fichas`,
      table_name: 'transactions',
      record_id: id,
      old_value: log,
    })

    revalidatePath('/operacional/log')

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir log:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir log'
    }
  }
}
