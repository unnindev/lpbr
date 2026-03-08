'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularValorChippix } from '@/lib/chippix'
import type { OperationType, TransactionType, Origem } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface TransactionWithRelations {
  id: string
  date: string
  operation_type: OperationType | null
  type: TransactionType
  chips: number | null
  value: number | null
  origem: Origem | null
  reconciled: boolean
  verified: boolean
  notes: string | null
  has_receipt: boolean
  player: {
    id: string
    nick: string
    name: string
  } | null
  bank: {
    id: string
    name: string
  } | null
}

interface DaySummary {
  fichasEnviadas: number
  fichasRecebidas: number
  fichasSaldo: number
  caixaEntradas: number
  caixaSaidas: number
  caixaSaldo: number
  saldosPorBanco: Array<{ bankId: string; bankName: string; saldo: number }>
}

export async function listarTransacoesPorData(dateStr: string) {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      date,
      operation_type,
      type,
      chips,
      value,
      origem,
      reconciled,
      verified,
      notes,
      has_receipt,
      player:players(id, nick, name),
      bank:banks(id, name)
    `)
    .eq('date', dateStr)
    .or('operation_type.is.null,operation_type.neq.AJUSTE_INICIAL')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao listar transações:', error)
    return []
  }

  return data as TransactionWithRelations[]
}

export async function getResumo(dateStr: string): Promise<DaySummary> {
  const supabase = await createClient() as SupabaseClient

  // Fichas enviadas (COMPRA_FICHAS, CREDITO_FICHAS, ACORDO_PAGAMENTO, etc.)
  const { data: enviadas } = await supabase
    .from('transactions')
    .select('chips')
    .eq('date', dateStr)
    .in('operation_type', ['COMPRA_FICHAS', 'CREDITO_FICHAS', 'ACORDO_PAGAMENTO', 'RANKING_PAGAMENTO_FICHAS', 'CASHBACK_FICHAS'])
    .gt('chips', 0)

  // Fichas recebidas (SAQUE_FICHAS, CREDITO_PAGAMENTO_FICHAS, ACORDO_COLETA, etc.)
  const { data: recebidas } = await supabase
    .from('transactions')
    .select('chips')
    .eq('date', dateStr)
    .in('operation_type', ['SAQUE_FICHAS', 'CREDITO_PAGAMENTO_FICHAS', 'ACORDO_COLETA', 'RANKING_COLETA', 'RAKE'])
    .gt('chips', 0)

  // Entradas de caixa
  const { data: entradas } = await supabase
    .from('transactions')
    .select('value')
    .eq('date', dateStr)
    .in('operation_type', ['COMPRA_FICHAS', 'CREDITO_PAGAMENTO_DINHEIRO', 'DEPOSITO_AVULSO'])
    .gt('value', 0)

  // Saídas de caixa
  const { data: saidas } = await supabase
    .from('transactions')
    .select('value')
    .eq('date', dateStr)
    .in('operation_type', ['SAQUE_FICHAS', 'CUSTO_DESPESA', 'SAQUE_AVULSO', 'CASHBACK_DINHEIRO', 'RANKING_PAGAMENTO_DINHEIRO'])
    .gt('value', 0)

  // Saldos por banco
  const { data: banks } = await supabase
    .from('banks')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const saldosPorBanco = []
  if (banks) {
    for (const bank of banks) {
      const { data: saldo } = await supabase.rpc('get_bank_balance', { p_bank_id: bank.id })
      saldosPorBanco.push({
        bankId: bank.id,
        bankName: bank.name,
        saldo: saldo || 0,
      })
    }
  }

  const fichasEnviadas = (enviadas || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const fichasRecebidas = (recebidas || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const caixaEntradas = (entradas || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)
  const caixaSaidas = (saidas || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  return {
    fichasEnviadas,
    fichasRecebidas,
    fichasSaldo: fichasEnviadas - fichasRecebidas,
    caixaEntradas,
    caixaSaidas,
    caixaSaldo: caixaEntradas - caixaSaidas,
    saldosPorBanco,
  }
}

interface NovaTransacaoData {
  date: string
  operationType: OperationType
  playerId?: string
  bankId?: string
  chips?: number
  value?: number
  origem?: Origem
  hasReceipt?: boolean
  notes?: string
  // Para acordos
  playerIdDe?: string
  playerIdPara?: string
}

function getTransactionType(operationType: OperationType): TransactionType {
  const logTypes: OperationType[] = [
    'COMPRA_FICHAS',
    'CREDITO_FICHAS',
    'SAQUE_FICHAS',
    'CREDITO_PAGAMENTO_FICHAS',
    'ACORDO_COLETA',
    'ACORDO_PAGAMENTO',
    'RANKING_COLETA',
    'RANKING_PAGAMENTO_FICHAS',
    'CASHBACK_FICHAS',
    'RAKE',
    'RAKE_AGENTE',
  ]

  const financialTypes: OperationType[] = [
    'CREDITO_PAGAMENTO_DINHEIRO',
    'CUSTO_DESPESA',
    'DEPOSITO_AVULSO',
    'SAQUE_AVULSO',
    'RANKING_PAGAMENTO_DINHEIRO',
    'CASHBACK_DINHEIRO',
  ]

  if (logTypes.includes(operationType)) return 'LOG'
  if (financialTypes.includes(operationType)) return 'FINANCIAL'
  return 'CONTROL'
}

export async function criarTransacao(data: NovaTransacaoData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Tratamento especial para acordos
    if (data.operationType === 'ACORDO_COLETA' || data.operationType === 'ACORDO_PAGAMENTO') {
      if (!data.playerIdDe || !data.playerIdPara || !data.chips) {
        return { success: false, error: 'Dados incompletos para acordo' }
      }

      const acordoId = crypto.randomUUID()

      // Criar ACORDO_COLETA (de quem sai)
      const { error: coletaError } = await supabase
        .from('transactions')
        .insert({
          date: data.date,
          operation_type: 'ACORDO_COLETA',
          type: 'LOG',
          chips: data.chips,
          player_id: data.playerIdDe,
          acordo_id: acordoId,
          reconciled: true,
          notes: data.notes || `[ACORDO] ${data.playerIdDe} → ${data.playerIdPara}`,
          created_by: user.id,
        })

      if (coletaError) throw coletaError

      // Criar ACORDO_PAGAMENTO (para quem vai)
      const { error: pagtoError } = await supabase
        .from('transactions')
        .insert({
          date: data.date,
          operation_type: 'ACORDO_PAGAMENTO',
          type: 'LOG',
          chips: data.chips,
          player_id: data.playerIdPara,
          acordo_id: acordoId,
          reconciled: true,
          notes: data.notes || `[ACORDO] ${data.playerIdDe} → ${data.playerIdPara}`,
          created_by: user.id,
        })

      if (pagtoError) throw pagtoError

      revalidatePath('/operacional/conciliacao')
      return { success: true }
    }

    // Tratamento normal
    let finalValue = data.value

    // Se for ChipPix, calcular valor automaticamente
    if (data.origem === 'CHIPPIX' && data.chips) {
      if (data.operationType === 'COMPRA_FICHAS') {
        finalValue = calcularValorChippix(data.chips, 'deposito')
      } else if (data.operationType === 'SAQUE_FICHAS') {
        finalValue = calcularValorChippix(data.chips, 'saque')
      }
    }

    const transactionType = getTransactionType(data.operationType)

    const { error } = await supabase
      .from('transactions')
      .insert({
        date: data.date,
        operation_type: data.operationType,
        type: transactionType,
        chips: data.chips || null,
        value: finalValue || null,
        player_id: data.playerId || null,
        bank_id: data.bankId || null,
        origem: data.origem || null,
        has_receipt: data.hasReceipt || false,
        reconciled: true,
        notes: data.notes || null,
        created_by: user.id,
      })

    if (error) throw error

    revalidatePath('/operacional/conciliacao')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar transação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar transação',
    }
  }
}

export async function conciliarTransacao(
  id: string,
  data: {
    operationType: OperationType
    playerId?: string
    bankId?: string
    chips?: number
    value?: number
    hasReceipt?: boolean
    notes?: string
  }
) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const transactionType = getTransactionType(data.operationType)

    const { error } = await supabase
      .from('transactions')
      .update({
        operation_type: data.operationType,
        type: transactionType,
        player_id: data.playerId || null,
        bank_id: data.bankId || null,
        chips: data.chips || null,
        value: data.value || null,
        has_receipt: data.hasReceipt || false,
        notes: data.notes || null,
        reconciled: true,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/operacional/conciliacao')
    return { success: true }
  } catch (error) {
    console.error('Erro ao conciliar transação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao conciliar transação',
    }
  }
}

export async function toggleVerified(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Buscar estado atual
    const { data: current } = await supabase
      .from('transactions')
      .select('verified')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('transactions')
      .update({ verified: !current?.verified })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/operacional/conciliacao')
    return { success: true }
  } catch (error) {
    console.error('Erro ao alternar verificação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alternar verificação',
    }
  }
}

export async function excluirTransacao(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Verificar se a transação existe e não está conciliada
    const { data: transaction } = await supabase
      .from('transactions')
      .select('reconciled, operation_type')
      .eq('id', id)
      .single()

    if (!transaction) {
      return { success: false, error: 'Transação não encontrada' }
    }

    if (transaction.reconciled && transaction.operation_type !== null) {
      return { success: false, error: 'Transações conciliadas não podem ser excluídas' }
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/operacional/conciliacao')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir transação:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir transação',
    }
  }
}

export async function listarBancos() {
  const supabase = await createClient() as SupabaseClient

  const { data } = await supabase
    .from('banks')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return data || []
}
