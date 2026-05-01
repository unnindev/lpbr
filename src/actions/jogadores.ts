'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeString } from '@/lib/formatters'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface Player {
  id: string
  club_id: string
  nick: string
  name: string
  notes: string | null
  is_active: boolean
}

interface PlayerListItem extends Player {
  usaChippix: boolean
}

export type ChippixFilter = 'todos' | 'usa' | 'nao_usa'

interface PlayerWithStats extends Player {
  totalComprado: number
  totalSacado: number
  dividaCredito: number
  usaChippix: boolean
}

export async function listarJogadores(search?: string, chippixFilter: ChippixFilter = 'todos'): Promise<PlayerListItem[]> {
  const supabase = await createClient() as SupabaseClient

  const [{ data: playersData, error }, { data: chippixTx }] = await Promise.all([
    supabase.from('players').select('id, club_id, nick, name, notes, is_active').order('nick'),
    supabase.from('transactions').select('player_id').eq('origem', 'CHIPPIX').not('player_id', 'is', null),
  ])

  if (error) {
    console.error('Erro ao listar jogadores:', error)
    return []
  }

  const chippixSet = new Set<string>(
    ((chippixTx || []) as Array<{ player_id: string | null }>)
      .map(t => t.player_id)
      .filter((id): id is string => !!id)
  )

  let result: PlayerListItem[] = (playersData as Player[]).map(p => ({
    ...p,
    usaChippix: chippixSet.has(p.id),
  }))

  if (chippixFilter === 'usa') {
    result = result.filter(p => p.usaChippix)
  } else if (chippixFilter === 'nao_usa') {
    result = result.filter(p => !p.usaChippix)
  }

  if (search) {
    const searchNormalized = normalizeString(search)
    result = result.filter(player =>
      normalizeString(player.nick).includes(searchNormalized) ||
      normalizeString(player.name).includes(searchNormalized) ||
      normalizeString(player.club_id).includes(searchNormalized)
    )
  }

  return result
}

export async function getJogadorComEstatisticas(playerId: string): Promise<PlayerWithStats | null> {
  const supabase = await createClient() as SupabaseClient

  // Buscar jogador
  const { data: player, error } = await supabase
    .from('players')
    .select('id, club_id, nick, name, notes, is_active')
    .eq('id', playerId)
    .single()

  if (error || !player) {
    return null
  }

  // Total comprado (COMPRA_FICHAS + CREDITO_FICHAS)
  const { data: compras } = await supabase
    .from('transactions')
    .select('chips')
    .eq('player_id', playerId)
    .in('operation_type', ['COMPRA_FICHAS', 'CREDITO_FICHAS'])

  const totalComprado = (compras || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Total sacado (SAQUE_FICHAS)
  const { data: saques } = await supabase
    .from('transactions')
    .select('chips')
    .eq('player_id', playerId)
    .eq('operation_type', 'SAQUE_FICHAS')

  const totalSacado = (saques || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Dívida de crédito (CREDITO_FICHAS - pagamentos)
  const { data: creditos } = await supabase
    .from('transactions')
    .select('chips, value, operation_type')
    .eq('player_id', playerId)
    .in('operation_type', ['CREDITO_FICHAS', 'CREDITO_PAGAMENTO_DINHEIRO', 'CREDITO_PAGAMENTO_FICHAS'])

  let dividaCredito = 0
  for (const tx of creditos || []) {
    if (tx.operation_type === 'CREDITO_FICHAS') {
      dividaCredito += tx.chips || 0
    } else {
      dividaCredito -= (tx.chips || tx.value || 0)
    }
  }

  // Verifica se o jogador tem alguma transação via ChipPix
  const { count: chippixCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('origem', 'CHIPPIX')

  return {
    ...player,
    totalComprado,
    totalSacado,
    dividaCredito: Math.max(0, dividaCredito),
    usaChippix: (chippixCount || 0) > 0,
  }
}

interface NovoJogadorData {
  club_id: string
  nick: string
  name: string
  notes?: string
}

export async function criarJogador(data: NovoJogadorData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('players')
      .insert({
        club_id: data.club_id,
        nick: data.nick,
        name: data.name,
        notes: data.notes || null,
      })

    if (error) {
      console.error('Erro ao criar jogador:', error)
      if (error.code === '23505') {
        return { success: false, error: 'Já existe um jogador com este código PPPoker' }
      }
      return { success: false, error: error.message || 'Erro ao criar jogador' }
    }

    revalidatePath('/jogadores')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar jogador:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar jogador',
    }
  }
}

export async function editarJogador(id: string, data: { nick: string; name: string; notes?: string }) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('players')
      .update({
        nick: data.nick,
        name: data.name,
        notes: data.notes || null,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/jogadores')
    return { success: true }
  } catch (error) {
    console.error('Erro ao editar jogador:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao editar jogador',
    }
  }
}

export async function toggleJogadorAtivo(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { data: current } = await supabase
      .from('players')
      .select('is_active')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('players')
      .update({ is_active: !current?.is_active })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/jogadores')
    return { success: true }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status',
    }
  }
}

export async function excluirJogador(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    // Verificar se existem transações associadas ao jogador
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', id)

    if (countError) throw countError

    if (count && count > 0) {
      return {
        success: false,
        error: `Este jogador possui ${count} transação(ões) associada(s) e não pode ser excluído. Considere desativá-lo em vez de excluir.`,
      }
    }

    // Excluir jogador e retornar o registro deletado para confirmar
    const { data: deleted, error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) throw error

    // Verificar se realmente deletou (RLS pode bloquear silenciosamente)
    if (!deleted || deleted.length === 0) {
      return {
        success: false,
        error: 'Não foi possível excluir o jogador. Verifique suas permissões.',
      }
    }

    revalidatePath('/jogadores')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir jogador:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir jogador',
    }
  }
}

interface TransacaoJogador {
  id: string
  date: string
  operation_type: string
  chips: number | null
  value: number | null
  notes: string | null
  bank: { name: string } | null
}

export async function getHistoricoJogador(playerId: string, mes?: string) {
  const supabase = await createClient() as SupabaseClient

  let query = supabase
    .from('transactions')
    .select(`
      id,
      date,
      operation_type,
      chips,
      value,
      notes,
      bank:banks(name)
    `)
    .eq('player_id', playerId)
    .order('date', { ascending: false })

  if (mes) {
    const [ano, mesNum] = mes.split('-')
    const startDate = `${ano}-${mesNum}-01`
    const endDate = parseInt(mesNum) === 12
      ? `${parseInt(ano) + 1}-01-01`
      : `${ano}-${String(parseInt(mesNum) + 1).padStart(2, '0')}-01`

    query = query.gte('date', startDate).lt('date', endDate)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    console.error('Erro ao buscar histórico:', error)
    return []
  }

  return data as TransacaoJogador[]
}

export async function getJogadoresComCredito() {
  const supabase = await createClient() as SupabaseClient

  // Buscar todos os jogadores com transações de crédito
  const { data: jogadoresComCredito } = await supabase
    .from('transactions')
    .select(`
      player_id,
      chips,
      value,
      operation_type,
      player:players(id, nick, name)
    `)
    .in('operation_type', ['CREDITO_FICHAS', 'CREDITO_PAGAMENTO_DINHEIRO', 'CREDITO_PAGAMENTO_FICHAS', 'CASHBACK_PAGAMENTO_DIVIDA'])

  // Agrupar por jogador e calcular dívida
  const dividas = new Map<string, { player: { id: string; nick: string; name: string }; divida: number }>()

  for (const tx of jogadoresComCredito || []) {
    if (!tx.player_id || !tx.player) continue

    const playerId = tx.player_id
    if (!dividas.has(playerId)) {
      dividas.set(playerId, { player: tx.player, divida: 0 })
    }

    const entry = dividas.get(playerId)!
    if (tx.operation_type === 'CREDITO_FICHAS') {
      entry.divida += tx.chips || 0
    } else {
      entry.divida -= (tx.chips || tx.value || 0)
    }
  }

  // Filtrar apenas jogadores com dívida > 0
  const result = []
  for (const [, value] of dividas) {
    if (value.divida > 0) {
      result.push({
        player: value.player,
        divida: value.divida,
      })
    }
  }

  return result.sort((a, b) => b.divida - a.divida)
}

export async function getTotalCredito() {
  const result = await getJogadoresComCredito()
  return result.reduce((acc, j) => acc + j.divida, 0)
}

interface TransacaoCredito {
  id: string
  date: string
  operation_type: string
  chips: number | null
  value: number | null
  notes: string | null
}

export async function getHistoricoCreditoJogador(playerId: string): Promise<TransacaoCredito[]> {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      date,
      operation_type,
      chips,
      value,
      notes
    `)
    .eq('player_id', playerId)
    .in('operation_type', ['CREDITO_FICHAS', 'CREDITO_PAGAMENTO_DINHEIRO', 'CREDITO_PAGAMENTO_FICHAS', 'CASHBACK_PAGAMENTO_DIVIDA'])
    .order('date', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico de crédito:', error)
    return []
  }

  return data as TransacaoCredito[]
}
