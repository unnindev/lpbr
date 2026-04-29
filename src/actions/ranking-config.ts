'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function requireCode() {
  const supabase = await createClient() as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Não autenticado', supabase, userId: null }

  const { data: u } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!u || u.role !== 'CODE') return { ok: false as const, error: 'Apenas CODE', supabase, userId: user.id }

  return { ok: true as const, supabase, userId: user.id }
}

// ============================================
// PONTOS
// ============================================

export interface VersaoPontos {
  id: string
  label: string
  ativa: boolean
  created_at: string
}

export interface ItemPontos {
  posicao: number
  pontos: number
}

export async function listarVersoesPontos(): Promise<VersaoPontos[]> {
  const guard = await requireCode()
  if (!guard.ok) return []

  const { data } = await guard.supabase
    .from('ranking_pontos_versoes')
    .select('id, label, ativa, created_at')
    .order('created_at', { ascending: false })

  return data || []
}

export async function listarItensPontos(versaoId: string): Promise<ItemPontos[]> {
  const guard = await requireCode()
  if (!guard.ok) return []

  const { data } = await guard.supabase
    .from('ranking_pontos_itens')
    .select('posicao, pontos')
    .eq('versao_id', versaoId)
    .order('posicao')

  return data || []
}

export async function criarVersaoPontos(label: string, clonarDeId?: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  const { data: nova, error } = await guard.supabase
    .from('ranking_pontos_versoes')
    .insert({ label, created_by: guard.userId })
    .select('id')
    .single()

  if (error || !nova) return { success: false, error: error?.message || 'Erro ao criar versão' }

  if (clonarDeId) {
    const { data: itens } = await guard.supabase
      .from('ranking_pontos_itens')
      .select('posicao, pontos')
      .eq('versao_id', clonarDeId)

    if (itens && itens.length > 0) {
      await guard.supabase
        .from('ranking_pontos_itens')
        .insert(itens.map((i: ItemPontos) => ({ versao_id: nova.id, posicao: i.posicao, pontos: i.pontos })))
    }
  }

  revalidatePath('/ranking-config')
  return { success: true, id: nova.id }
}

export async function renomearVersaoPontos(id: string, label: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  const { error } = await guard.supabase
    .from('ranking_pontos_versoes')
    .update({ label })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}

export async function ativarVersaoPontos(id: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  // Desativa qualquer versão ativa antes de ativar a nova (índice unique exige isso)
  await guard.supabase
    .from('ranking_pontos_versoes')
    .update({ ativa: false })
    .eq('ativa', true)

  const { error } = await guard.supabase
    .from('ranking_pontos_versoes')
    .update({ ativa: true })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}

export async function excluirVersaoPontos(id: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  // Bloqueia exclusão se versão estiver em uso por etapas
  const { count } = await guard.supabase
    .from('ranking_etapas')
    .select('*', { count: 'exact', head: true })
    .eq('pontos_versao_id', id)

  if ((count || 0) > 0) {
    return { success: false, error: 'Esta versão já está sendo usada em etapas — não pode ser excluída.' }
  }

  const { error } = await guard.supabase
    .from('ranking_pontos_versoes')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}

export async function salvarItensPontos(versaoId: string, itens: ItemPontos[]) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  // Substitui todos os itens da versão
  await guard.supabase.from('ranking_pontos_itens').delete().eq('versao_id', versaoId)

  if (itens.length > 0) {
    const { error } = await guard.supabase
      .from('ranking_pontos_itens')
      .insert(itens.map(i => ({ versao_id: versaoId, posicao: i.posicao, pontos: i.pontos })))
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/ranking-config')
  return { success: true }
}

// ============================================
// PREMIAÇÃO
// ============================================

export interface VersaoPremiacao {
  id: string
  label: string
  ativa: boolean
  created_at: string
}

export interface ItemPremiacao {
  posicao: number
  percentual: number
}

export async function listarVersoesPremiacao(): Promise<VersaoPremiacao[]> {
  const guard = await requireCode()
  if (!guard.ok) return []

  const { data } = await guard.supabase
    .from('ranking_premiacao_versoes')
    .select('id, label, ativa, created_at')
    .order('created_at', { ascending: false })

  return data || []
}

export async function listarItensPremiacao(versaoId: string): Promise<ItemPremiacao[]> {
  const guard = await requireCode()
  if (!guard.ok) return []

  const { data } = await guard.supabase
    .from('ranking_premiacao_itens')
    .select('posicao, percentual')
    .eq('versao_id', versaoId)
    .order('posicao')

  return data || []
}

export async function criarVersaoPremiacao(label: string, clonarDeId?: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  const { data: nova, error } = await guard.supabase
    .from('ranking_premiacao_versoes')
    .insert({ label, created_by: guard.userId })
    .select('id')
    .single()

  if (error || !nova) return { success: false, error: error?.message || 'Erro ao criar versão' }

  if (clonarDeId) {
    const { data: itens } = await guard.supabase
      .from('ranking_premiacao_itens')
      .select('posicao, percentual')
      .eq('versao_id', clonarDeId)

    if (itens && itens.length > 0) {
      await guard.supabase
        .from('ranking_premiacao_itens')
        .insert(itens.map((i: ItemPremiacao) => ({ versao_id: nova.id, posicao: i.posicao, percentual: i.percentual })))
    }
  }

  revalidatePath('/ranking-config')
  return { success: true, id: nova.id }
}

export async function renomearVersaoPremiacao(id: string, label: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  const { error } = await guard.supabase
    .from('ranking_premiacao_versoes')
    .update({ label })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}

export async function ativarVersaoPremiacao(id: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  await guard.supabase
    .from('ranking_premiacao_versoes')
    .update({ ativa: false })
    .eq('ativa', true)

  const { error } = await guard.supabase
    .from('ranking_premiacao_versoes')
    .update({ ativa: true })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}

export async function excluirVersaoPremiacao(id: string) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  const { error } = await guard.supabase
    .from('ranking_premiacao_versoes')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}

export async function salvarItensPremiacao(versaoId: string, itens: ItemPremiacao[]) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  await guard.supabase.from('ranking_premiacao_itens').delete().eq('versao_id', versaoId)

  if (itens.length > 0) {
    const { error } = await guard.supabase
      .from('ranking_premiacao_itens')
      .insert(itens.map(i => ({ versao_id: versaoId, posicao: i.posicao, percentual: i.percentual })))
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/ranking-config')
  return { success: true }
}

// ============================================
// CONFIG GERAL
// ============================================

export async function getDefaultColetaPercentual(): Promise<number> {
  const supabase = await createClient() as SupabaseClient
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'default_coleta_percentual')
    .single()
  return parseFloat(data?.value || '8') || 8
}

export async function setDefaultColetaPercentual(value: number) {
  const guard = await requireCode()
  if (!guard.ok) return { success: false, error: guard.error }

  const { error } = await guard.supabase
    .from('system_config')
    .upsert({
      key: 'default_coleta_percentual',
      value: value.toString(),
      updated_at: new Date().toISOString(),
      updated_by: guard.userId,
    }, { onConflict: 'key' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking-config')
  return { success: true }
}
