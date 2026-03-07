'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface AuditLogEntry {
  id: string
  created_at: string
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  user: {
    name: string
  } | null
}

interface FiltrosHistorico {
  dataInicio?: string
  dataFim?: string
  tabela?: string
  usuario?: string
  limit?: number
  offset?: number
}

export async function listarHistorico(filtros: FiltrosHistorico = {}) {
  const supabase = await createClient() as SupabaseClient

  let query = supabase
    .from('audit_log')
    .select(`
      id,
      created_at,
      user_id,
      action,
      table_name,
      record_id,
      old_value,
      new_value,
      user:users(name)
    `)
    .order('created_at', { ascending: false })

  if (filtros.dataInicio) {
    query = query.gte('created_at', `${filtros.dataInicio}T00:00:00`)
  }

  if (filtros.dataFim) {
    query = query.lte('created_at', `${filtros.dataFim}T23:59:59`)
  }

  if (filtros.tabela) {
    query = query.eq('table_name', filtros.tabela)
  }

  if (filtros.usuario) {
    query = query.eq('user_id', filtros.usuario)
  }

  const limit = filtros.limit || 100
  const offset = filtros.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('Erro ao listar histórico:', error)
    return []
  }

  return data as AuditLogEntry[]
}

export async function getTabelasComLog(): Promise<string[]> {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase
    .from('audit_log')
    .select('table_name')

  if (error) {
    console.error('Erro ao buscar tabelas:', error)
    return []
  }

  // Retornar valores únicos
  const tabelas = [...new Set((data || []).map((d: { table_name: string }) => d.table_name))] as string[]
  return tabelas.sort()
}

export async function getUsuariosComLog(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      user_id,
      user:users(id, name)
    `)

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return []
  }

  // Retornar valores únicos com nome
  const usuariosMap = new Map<string, { id: string; name: string }>()
  for (const d of data || []) {
    if (d.user_id && d.user) {
      usuariosMap.set(d.user_id, { id: d.user.id, name: d.user.name })
    }
  }

  return Array.from(usuariosMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

