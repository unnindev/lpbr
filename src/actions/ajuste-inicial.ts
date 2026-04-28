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
      const { error: rankingError } = await supabase
        .from('transactions')
        .insert({
          date: dataAjuste,
          operation_type: 'AJUSTE_RANKING',
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

interface AjusteInicialExistente {
  fichasCirculacao: number
  saldoRanking: number
  dataAjuste: string | null
}

export async function getAjusteInicialExistente(): Promise<AjusteInicialExistente> {
  const supabase = await createClient() as SupabaseClient

  // Buscar transações de AJUSTE_INICIAL e AJUSTE_RANKING
  const { data: ajustes } = await supabase
    .from('transactions')
    .select('id, chips, notes, date')
    .in('operation_type', ['AJUSTE_INICIAL', 'AJUSTE_RANKING'])
    .is('bank_id', null) // Apenas fichas e ranking, não bancos

  let fichasCirculacao = 0
  let saldoRanking = 0
  let dataAjuste: string | null = null

  if (ajustes && ajustes.length > 0) {
    for (const ajuste of ajustes) {
      if (ajuste.notes?.includes('Fichas em circulação')) {
        fichasCirculacao = ajuste.chips || 0
        dataAjuste = ajuste.date
      } else if (ajuste.notes?.includes('Saldo de ranking')) {
        saldoRanking = ajuste.chips || 0
        if (!dataAjuste) dataAjuste = ajuste.date
      }
    }
  }

  return { fichasCirculacao, saldoRanking, dataAjuste }
}

export async function atualizarAjusteInicial(data: AjusteInicialData) {
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
    return { success: false, error: 'Apenas usuários CODE podem editar ajuste inicial' }
  }

  try {
    const dataAjuste = data.data || new Date().toISOString().split('T')[0]

    // 1. Atualizar saldo inicial de cada banco
    for (const banco of data.bancos) {
      // Atualizar initial_balance do banco
      const { error: bankError } = await supabase
        .from('banks')
        .update({ initial_balance: banco.valor })
        .eq('id', banco.id)

      if (bankError) throw bankError

      // Verificar se já existe transação de ajuste para este banco
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('operation_type', 'AJUSTE_INICIAL')
        .eq('bank_id', banco.id)
        .single()

      if (existingTx) {
        // Atualizar transação existente
        const { error: txError } = await supabase
          .from('transactions')
          .update({
            date: dataAjuste,
            value: banco.valor,
          })
          .eq('id', existingTx.id)

        if (txError) throw txError
      } else if (banco.valor !== 0) {
        // Criar nova transação
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

    // 2. Atualizar/criar transação para fichas em circulação
    const { data: existingFichas } = await supabase
      .from('transactions')
      .select('id')
      .eq('operation_type', 'AJUSTE_INICIAL')
      .is('bank_id', null)
      .ilike('notes', '%Fichas em circulação%')
      .single()

    if (existingFichas) {
      const { error: fichasError } = await supabase
        .from('transactions')
        .update({
          date: dataAjuste,
          chips: data.fichasCirculacao,
        })
        .eq('id', existingFichas.id)

      if (fichasError) throw fichasError
    } else if (data.fichasCirculacao > 0) {
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

    // 3. Atualizar/criar transação para saldo de ranking
    const { data: existingRanking } = await supabase
      .from('transactions')
      .select('id')
      .in('operation_type', ['AJUSTE_RANKING', 'AJUSTE_INICIAL'])
      .is('bank_id', null)
      .ilike('notes', '%Saldo de ranking%')
      .single()

    if (existingRanking) {
      const { error: rankingError } = await supabase
        .from('transactions')
        .update({
          date: dataAjuste,
          operation_type: 'AJUSTE_RANKING',
          chips: data.saldoRanking,
        })
        .eq('id', existingRanking.id)

      if (rankingError) throw rankingError
    } else if (data.saldoRanking > 0) {
      const { error: rankingError } = await supabase
        .from('transactions')
        .insert({
          date: dataAjuste,
          operation_type: 'AJUSTE_RANKING',
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
      action: 'Ajuste inicial atualizado',
      table_name: 'transactions',
      new_value: data,
    })

    revalidatePath('/ajuste-inicial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar ajuste inicial:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar ajuste inicial'
    }
  }
}
