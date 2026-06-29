'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface ControleSupremaRow {
  id: string
  player_id: string
  saldo_devedor: number
  saldo_semana: number
  saldo_final: number
  updated_at: string
  created_at: string
  player: {
    id: string
    nick: string
    name: string
    club_id: string
  }
}

const PATH = '/agentes/suprema'

/**
 * Lista todas as linhas da planilha de controle Suprema,
 * já com os dados do jogador associado.
 */
export async function listarControleSuprema(): Promise<ControleSupremaRow[]> {
  const supabase = (await createClient()) as SupabaseClient

  const { data, error } = await supabase
    .from('controle_suprema')
    .select(
      `
      id,
      player_id,
      saldo_devedor,
      saldo_semana,
      saldo_final,
      updated_at,
      created_at,
      player:players!controle_suprema_player_id_fkey(id, nick, name, club_id)
    `
    )
    .order('created_at')

  if (error) {
    console.error('Erro ao listar controle suprema:', error)
    return []
  }

  return (data || []) as ControleSupremaRow[]
}

/**
 * Adiciona um jogador na planilha (linha nova com saldos zerados).
 */
export async function adicionarLinhaControle(playerId: string) {
  const supabase = (await createClient()) as SupabaseClient

  if (!playerId) {
    return { success: false, error: 'Selecione um jogador' }
  }

  const { error } = await supabase.from('controle_suprema').insert({
    player_id: playerId,
    saldo_devedor: 0,
    saldo_semana: 0,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este jogador já está na planilha' }
    }
    console.error('Erro ao adicionar linha controle:', error)
    return { success: false, error: 'Erro ao adicionar jogador' }
  }

  revalidatePath(PATH)
  return { success: true }
}

/**
 * Atualiza os saldos (DEVEDOR e SEM ATUAL) de uma linha.
 * O FINAL e o updated_at são recalculados pelo banco.
 */
export async function atualizarLinhaControle(
  id: string,
  data: { saldoDevedor: number; saldoSemana: number }
) {
  const supabase = (await createClient()) as SupabaseClient

  const devedor = Number.isFinite(data.saldoDevedor) ? data.saldoDevedor : 0
  const semana = Number.isFinite(data.saldoSemana) ? data.saldoSemana : 0

  const { error } = await supabase
    .from('controle_suprema')
    .update({
      saldo_devedor: devedor,
      saldo_semana: semana,
    })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar linha controle:', error)
    return { success: false, error: 'Erro ao salvar' }
  }

  revalidatePath(PATH)
  return { success: true }
}

/**
 * Remove uma linha da planilha.
 */
export async function excluirLinhaControle(id: string) {
  const supabase = (await createClient()) as SupabaseClient

  const { error } = await supabase.from('controle_suprema').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir linha controle:', error)
    return { success: false, error: 'Erro ao excluir' }
  }

  revalidatePath(PATH)
  return { success: true }
}
