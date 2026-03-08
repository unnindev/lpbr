'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface AjusteInicialData {
  bancos: Array<{
    id: string
    valor: number
  }>
  fichasCirculacao: number
  saldoRanking: number
  data?: string // formato yyyy-MM-dd
}

export async function salvarAjusteInicial(data: AjusteInicialData) {
  const supabase = await createClient() as SupabaseClient

  // Verificar usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  // Verificar se é CODE
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'CODE') {
    return { success: false, error: 'Apenas usuários CODE podem fazer ajuste inicial' }
  }

  try {
    const dataAjuste = data.data || new Date().toISOString().split('T')[0]

    // 1. Atualizar saldo inicial de cada banco
    for (const banco of data.bancos) {
      if (banco.valor !== 0) {
        // Atualizar initial_balance do banco
        const { error: bankError } = await supabase
          .from('banks')
          .update({ initial_balance: banco.valor })
          .eq('id', banco.id)

        if (bankError) throw bankError

        // Criar transação de ajuste inicial
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            date: dataAjuste,
            operation_type: 'AJUSTE_INICIAL',
            type: 'CONTROL',
            value: banco.valor,
            bank_id: banco.id,
            reconciled: true,
            created_by: user.id,
            notes: 'Ajuste inicial do sistema',
          })

        if (txError) throw txError
      }
    }

    // 2. Criar transação para fichas em circulação inicial (se > 0)
    if (data.fichasCirculacao > 0) {
      const { error: fichasError } = await supabase
        .from('transactions')
        .insert({
          date: dataAjuste,
          operation_type: 'AJUSTE_INICIAL',
          type: 'CONTROL',
          chips: data.fichasCirculacao,
          reconciled: true,
          created_by: user.id,
          notes: 'Ajuste inicial - Fichas em circulação',
        })

      if (fichasError) throw fichasError
    }

    // 3. Criar transação para saldo de ranking inicial (se > 0)
    if (data.saldoRanking > 0) {
      // Criar como AJUSTE_INICIAL para não afetar fichas em circulação
      const { error: rankingError } = await supabase
        .from('transactions')
        .insert({
          date: dataAjuste,
          operation_type: 'AJUSTE_INICIAL',
          type: 'CONTROL',
          chips: data.saldoRanking,
          reconciled: true,
          created_by: user.id,
          notes: 'Ajuste inicial - Saldo de ranking',
        })

      if (rankingError) throw rankingError
    }

    // 4. Registrar no audit_log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'Ajuste inicial do sistema realizado',
      table_name: 'transactions',
      new_value: data,
    })

    revalidatePath('/ajuste-inicial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar ajuste inicial:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar ajuste inicial'
    }
  }
}

export async function verificarAjusteInicial() {
  const supabase = await createClient() as SupabaseClient

  // Verificar se já existe algum ajuste inicial
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('operation_type', 'AJUSTE_INICIAL')

  return { jaRealizado: (count || 0) > 0 }
}
