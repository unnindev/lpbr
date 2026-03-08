'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface Agent {
  id: string
  platform: 'PPOKER' | 'SUPREMA'
  pct_rakeback: number
  pct_lpbr: number
  is_active: boolean
  player: {
    id: string
    nick: string
    name: string
    club_id: string
  }
}

interface AgentWithFolder extends Agent {
  players: Array<{
    id: string
    nick: string
    name: string
    club_id: string
  }>
}

export async function listarAgentes(platform: 'PPOKER' | 'SUPREMA') {
  const supabase = await createClient() as SupabaseClient

  const { data: agents, error } = await supabase
    .from('agents')
    .select(`
      id,
      platform,
      pct_rakeback,
      pct_lpbr,
      is_active,
      player:players!agents_player_id_fkey(id, nick, name, club_id)
    `)
    .eq('platform', platform)
    .eq('is_active', true)
    .order('created_at')

  if (error) {
    console.error('Erro ao listar agentes:', error)
    return []
  }

  // Buscar jogadores de cada agente
  const result: AgentWithFolder[] = []
  for (const agent of agents || []) {
    const { data: folders } = await supabase
      .from('agent_folders')
      .select(`
        player:players(id, nick, name, club_id)
      `)
      .eq('agent_id', agent.id)
      .eq('is_active', true)

    result.push({
      ...agent,
      players: (folders || []).map((f: { player: { id: string; nick: string; name: string; club_id: string } }) => f.player),
    })
  }

  return result
}

interface NovoAgenteData {
  playerId: string
  platform: 'PPOKER' | 'SUPREMA'
  pctRakeback: number
  pctLpbr: number
}

export async function criarAgente(data: NovoAgenteData) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  // Validar soma = 100
  if (data.pctRakeback + data.pctLpbr !== 100) {
    return { success: false, error: 'Rakeback% + LPBR% deve ser igual a 100%' }
  }

  try {
    const { error } = await supabase
      .from('agents')
      .insert({
        player_id: data.playerId,
        platform: data.platform,
        pct_rakeback: data.pctRakeback,
        pct_lpbr: data.pctLpbr,
      })

    if (error) {
      console.error('Erro Supabase ao criar agente:', error)
      return { success: false, error: error.message || 'Erro ao criar agente' }
    }

    revalidatePath('/agentes')
    return { success: true }
  } catch (error) {
    console.error('Exception ao criar agente:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar agente',
    }
  }
}

export async function editarAgente(id: string, data: { pctRakeback: number; pctLpbr: number }) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  if (data.pctRakeback + data.pctLpbr !== 100) {
    return { success: false, error: 'Rakeback% + LPBR% deve ser igual a 100%' }
  }

  try {
    const { error } = await supabase
      .from('agents')
      .update({
        pct_rakeback: data.pctRakeback,
        pct_lpbr: data.pctLpbr,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/agentes')
    return { success: true }
  } catch (error) {
    console.error('Erro ao editar agente:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao editar agente',
    }
  }
}

export async function excluirAgente(id: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('agents')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/agentes')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir agente:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir agente',
    }
  }
}

export async function adicionarJogadorPasta(agentId: string, playerId: string, platform: 'PPOKER' | 'SUPREMA') {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('agent_folders')
      .insert({
        agent_id: agentId,
        player_id: playerId,
        platform,
      })

    if (error) throw error

    revalidatePath('/agentes')
    return { success: true }
  } catch (error) {
    console.error('Erro ao adicionar jogador:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar jogador',
    }
  }
}

export async function removerJogadorPasta(agentId: string, playerId: string) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    const { error } = await supabase
      .from('agent_folders')
      .update({ is_active: false })
      .eq('agent_id', agentId)
      .eq('player_id', playerId)

    if (error) throw error

    revalidatePath('/agentes')
    return { success: true }
  } catch (error) {
    console.error('Erro ao remover jogador:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao remover jogador',
    }
  }
}

// Rake Semanal
interface RakeSemanalEntry {
  agentId: string
  valorRake: number
}

export async function salvarRakeSemanal(data: {
  weekStart: string
  weekEnd: string
  platform: 'PPOKER' | 'SUPREMA'
  entries: RakeSemanalEntry[]
}) {
  const supabase = await createClient() as SupabaseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  try {
    for (const entry of data.entries) {
      if (entry.valorRake <= 0) continue

      // Buscar dados do agente
      const { data: agent } = await supabase
        .from('agents')
        .select('player_id, pct_rakeback')
        .eq('id', entry.agentId)
        .single()

      if (!agent) continue

      const rakeback = entry.valorRake * (agent.pct_rakeback / 100)

      // Criar transação de rake do agente
      const { error } = await supabase
        .from('transactions')
        .insert({
          date: data.weekEnd,
          operation_type: 'RAKE_AGENTE',
          type: 'LOG',
          chips: rakeback,
          player_id: agent.player_id,
          reconciled: false,
          notes: `Rakeback semana ${data.weekStart} a ${data.weekEnd} (${data.platform})`,
          created_by: user.id,
        })

      if (error) throw error
    }

    revalidatePath('/rake-semanal')
    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar rake semanal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar rake semanal',
    }
  }
}
