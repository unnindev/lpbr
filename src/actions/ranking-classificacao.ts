'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function getAuthed() {
  const supabase = await createClient() as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, supabase, userId: null, error: 'Não autenticado' }
  return { ok: true as const, supabase, userId: user.id }
}

export interface EtapaResumo {
  id: string
  nome: string
  data_realizada: string
  mes_referencia: string
  percentual_coleta: number
  pontos_versao_id: string | null
  pontos_versao_label: string | null
  total_classificacoes: number
  total_coletas: number
}

export interface EtapaDetalhe {
  id: string
  nome: string
  data_realizada: string
  mes_referencia: string
  percentual_coleta: number
  pontos_versao_id: string | null
  pontos_versao_label: string | null
  classificacoes: Array<{
    id: string
    player_id: string
    player_nick: string
    player_name: string
    posicao: number
    pontos_snapshot: number
    foi_premiado: boolean
    premio_chips: number | null
    coleta_transaction_id: string | null
  }>
}

// ============================================
// LISTAGEM / DETALHES
// ============================================

export async function listarEtapas(mesReferencia?: string): Promise<EtapaResumo[]> {
  const auth = await getAuthed()
  if (!auth.ok) return []

  let query = auth.supabase
    .from('ranking_etapas')
    .select(`
      id, nome, data_realizada, mes_referencia, percentual_coleta, pontos_versao_id,
      pontos_versao:ranking_pontos_versoes(label)
    `)
    .order('data_realizada', { ascending: false })

  if (mesReferencia) {
    query = query.eq('mes_referencia', mesReferencia)
  }

  const { data: etapas } = await query
  if (!etapas) return []

  const ids = etapas.map((e: { id: string }) => e.id)
  const counts: Record<string, { c: number; t: number }> = {}

  if (ids.length > 0) {
    const { data: classCount } = await auth.supabase
      .from('ranking_classificacoes')
      .select('etapa_id')
      .in('etapa_id', ids)

    const { data: txCount } = await auth.supabase
      .from('transactions')
      .select('ranking_etapa_id')
      .in('ranking_etapa_id', ids)
      .eq('operation_type', 'RANKING_COLETA')

    for (const row of classCount || []) {
      const id = row.etapa_id as string
      if (!counts[id]) counts[id] = { c: 0, t: 0 }
      counts[id].c++
    }
    for (const row of txCount || []) {
      const id = row.ranking_etapa_id as string
      if (!counts[id]) counts[id] = { c: 0, t: 0 }
      counts[id].t++
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return etapas.map((e: any) => ({
    id: e.id,
    nome: e.nome,
    data_realizada: e.data_realizada,
    mes_referencia: e.mes_referencia,
    percentual_coleta: parseFloat(e.percentual_coleta),
    pontos_versao_id: e.pontos_versao_id,
    pontos_versao_label: e.pontos_versao?.label || null,
    total_classificacoes: counts[e.id]?.c || 0,
    total_coletas: counts[e.id]?.t || 0,
  }))
}

export async function listarMesesReferencia(): Promise<string[]> {
  const auth = await getAuthed()
  if (!auth.ok) return []

  const { data } = await auth.supabase
    .from('ranking_etapas')
    .select('mes_referencia')
    .order('mes_referencia', { ascending: false })

  if (!data) return []
  const set = new Set<string>(data.map((d: { mes_referencia: string }) => d.mes_referencia))
  return Array.from(set)
}

export async function getEtapa(id: string): Promise<EtapaDetalhe | null> {
  const auth = await getAuthed()
  if (!auth.ok) return null

  const { data: etapa } = await auth.supabase
    .from('ranking_etapas')
    .select(`
      id, nome, data_realizada, mes_referencia, percentual_coleta, pontos_versao_id,
      pontos_versao:ranking_pontos_versoes(label)
    `)
    .eq('id', id)
    .single()

  if (!etapa) return null

  const { data: classifs } = await auth.supabase
    .from('ranking_classificacoes')
    .select(`
      id, posicao, pontos_snapshot, foi_premiado, premio_chips, coleta_transaction_id,
      player:players(id, nick, name)
    `)
    .eq('etapa_id', id)
    .order('posicao')

  return {
    id: etapa.id,
    nome: etapa.nome,
    data_realizada: etapa.data_realizada,
    mes_referencia: etapa.mes_referencia,
    percentual_coleta: parseFloat(etapa.percentual_coleta),
    pontos_versao_id: etapa.pontos_versao_id,
    pontos_versao_label: etapa.pontos_versao?.label || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    classificacoes: (classifs || []).map((c: any) => ({
      id: c.id,
      player_id: c.player.id,
      player_nick: c.player.nick,
      player_name: c.player.name,
      posicao: c.posicao,
      pontos_snapshot: parseFloat(c.pontos_snapshot),
      foi_premiado: c.foi_premiado,
      premio_chips: c.premio_chips ? parseFloat(c.premio_chips) : null,
      coleta_transaction_id: c.coleta_transaction_id,
    })),
  }
}

export async function getPontosVersao(versaoId: string): Promise<Record<number, number>> {
  const auth = await getAuthed()
  if (!auth.ok) return {}

  const { data } = await auth.supabase
    .from('ranking_pontos_itens')
    .select('posicao, pontos')
    .eq('versao_id', versaoId)

  if (!data) return {}
  const mapa: Record<number, number> = {}
  for (const i of data) {
    mapa[i.posicao] = parseFloat(i.pontos)
  }
  return mapa
}

// ============================================
// CRUD ETAPA
// ============================================

interface EtapaInput {
  nome: string
  data_realizada: string
  mes_referencia: string
  pontos_versao_id: string | null
  percentual_coleta: number
}

export async function criarEtapa(input: EtapaInput) {
  const auth = await getAuthed()
  if (!auth.ok) return { success: false, error: auth.error }

  const { data, error } = await auth.supabase
    .from('ranking_etapas')
    .insert({
      ...input,
      created_by: auth.userId,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking/classificacao')
  return { success: true, id: data.id }
}

export async function editarEtapa(id: string, input: EtapaInput) {
  const auth = await getAuthed()
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from('ranking_etapas')
    .update(input)
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking/classificacao')
  revalidatePath(`/ranking/classificacao/${id}`)
  return { success: true }
}

export async function excluirEtapa(id: string) {
  const auth = await getAuthed()
  if (!auth.ok) return { success: false, error: auth.error }

  // Apagar coletas geradas pela etapa
  await auth.supabase
    .from('transactions')
    .delete()
    .eq('ranking_etapa_id', id)
    .eq('operation_type', 'RANKING_COLETA')

  const { error } = await auth.supabase
    .from('ranking_etapas')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/ranking/classificacao')
  return { success: true }
}

// ============================================
// SALVAR CLASSIFICAÇÃO + SINCRONIZAR COLETAS
// ============================================

export interface ClassificacaoInput {
  player_id: string
  posicao: number
  foi_premiado: boolean
  premio_chips: number | null
}

export async function salvarClassificacao(etapaId: string, linhas: ClassificacaoInput[]) {
  const auth = await getAuthed()
  if (!auth.ok) return { success: false, error: auth.error }

  // 1. Carrega etapa (precisa de pontos_versao + percentual_coleta + data)
  const { data: etapa } = await auth.supabase
    .from('ranking_etapas')
    .select('id, data_realizada, percentual_coleta, pontos_versao_id')
    .eq('id', etapaId)
    .single()

  if (!etapa) return { success: false, error: 'Etapa não encontrada' }

  // 2. Carrega pontos da versão (se houver)
  const pontosMapa: Record<number, number> = {}
  if (etapa.pontos_versao_id) {
    const { data: itens } = await auth.supabase
      .from('ranking_pontos_itens')
      .select('posicao, pontos')
      .eq('versao_id', etapa.pontos_versao_id)
    for (const i of itens || []) {
      pontosMapa[i.posicao] = parseFloat(i.pontos)
    }
  }

  // 3. Carrega classificações + coletas linkadas existentes (para reconciliar)
  const { data: existentes } = await auth.supabase
    .from('ranking_classificacoes')
    .select('id, player_id, coleta_transaction_id')
    .eq('etapa_id', etapaId)

  const existentesMap = new Map<string, { id: string; coleta_transaction_id: string | null }>()
  for (const e of existentes || []) {
    existentesMap.set(e.player_id, { id: e.id, coleta_transaction_id: e.coleta_transaction_id })
  }

  const playersEnviados = new Set(linhas.map(l => l.player_id))
  const percentual = parseFloat(etapa.percentual_coleta)

  // 4. Remove classificações que não vieram no payload (e suas coletas linkadas)
  for (const [playerId, info] of existentesMap.entries()) {
    if (!playersEnviados.has(playerId)) {
      if (info.coleta_transaction_id) {
        await auth.supabase.from('transactions').delete().eq('id', info.coleta_transaction_id)
      }
      await auth.supabase.from('ranking_classificacoes').delete().eq('id', info.id)
    }
  }

  // 5. Upsert por linha
  for (const linha of linhas) {
    const pontos = pontosMapa[linha.posicao] || 0
    const existente = existentesMap.get(linha.player_id)
    const premio = linha.foi_premiado ? (linha.premio_chips || 0) : 0
    const coletaChips = premio * (percentual / 100)

    let coletaTxId: string | null = existente?.coleta_transaction_id || null

    // Sincroniza coleta
    if (linha.foi_premiado && premio > 0) {
      if (coletaTxId) {
        await auth.supabase
          .from('transactions')
          .update({ chips: coletaChips, date: etapa.data_realizada, player_id: linha.player_id })
          .eq('id', coletaTxId)
      } else {
        const { data: novaTx } = await auth.supabase
          .from('transactions')
          .insert({
            date: etapa.data_realizada,
            operation_type: 'RANKING_COLETA',
            type: 'CONTROL',
            chips: coletaChips,
            player_id: linha.player_id,
            ranking_etapa_id: etapaId,
            reconciled: true,
            created_by: auth.userId,
            notes: `Coleta ranking: ${percentual}% de ${premio} fichas`,
          })
          .select('id')
          .single()
        coletaTxId = novaTx?.id || null
      }
    } else if (coletaTxId) {
      // Não é mais premiado → remover coleta antiga
      await auth.supabase.from('transactions').delete().eq('id', coletaTxId)
      coletaTxId = null
    }

    // Upsert da classificação
    if (existente) {
      await auth.supabase
        .from('ranking_classificacoes')
        .update({
          posicao: linha.posicao,
          pontos_snapshot: pontos,
          foi_premiado: linha.foi_premiado,
          premio_chips: linha.foi_premiado ? linha.premio_chips : null,
          coleta_transaction_id: coletaTxId,
        })
        .eq('id', existente.id)
    } else {
      await auth.supabase.from('ranking_classificacoes').insert({
        etapa_id: etapaId,
        player_id: linha.player_id,
        posicao: linha.posicao,
        pontos_snapshot: pontos,
        foi_premiado: linha.foi_premiado,
        premio_chips: linha.foi_premiado ? linha.premio_chips : null,
        coleta_transaction_id: coletaTxId,
      })
    }
  }

  revalidatePath('/ranking/classificacao')
  revalidatePath(`/ranking/classificacao/${etapaId}`)
  revalidatePath('/ranking')
  return { success: true }
}

// ============================================
// VERSÕES (helper para selectors)
// ============================================

export async function listarVersoesPontosResumo(): Promise<Array<{ id: string; label: string; ativa: boolean }>> {
  const auth = await getAuthed()
  if (!auth.ok) return []

  const { data } = await auth.supabase
    .from('ranking_pontos_versoes')
    .select('id, label, ativa')
    .order('created_at', { ascending: false })

  return data || []
}

export async function getDefaultColetaPercentual(): Promise<number> {
  const supabase = await createClient() as SupabaseClient
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'default_coleta_percentual')
    .single()
  return parseFloat(data?.value || '8') || 8
}
