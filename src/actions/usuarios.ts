'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface Usuario {
  id: string
  created_at: string
  name: string
  role: UserRole
  is_active: boolean
  email?: string
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const supabase = await createClient() as SupabaseClient

  // Verificar se o usuário atual é CODE
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'CODE') {
    return []
  }

  // Buscar todos os usuários
  const { data: users, error } = await supabase
    .from('users')
    .select('id, created_at, name, role, is_active')
    .order('name')

  if (error) {
    console.error('Erro ao listar usuários:', error)
    return []
  }

  // Buscar emails do auth.users (se disponível via RPC)
  // Por segurança, apenas retornamos os dados da tabela users
  return users as Usuario[]
}

export async function getUsuario(userId: string): Promise<Usuario | null> {
  const supabase = await createClient() as SupabaseClient

  const { data, error } = await supabase
    .from('users')
    .select('id, created_at, name, role, is_active')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }

  return data as Usuario
}

interface CriarUsuarioData {
  email: string
  password: string
  name: string
  role: UserRole
}

export async function criarUsuario(data: CriarUsuarioData) {
  const supabase = await createClient() as SupabaseClient

  // Verificar se o usuário atual é CODE
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'CODE') {
    return { success: false, error: 'Sem permissão para criar usuários' }
  }

  try {
    // Criar usuário no auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    })

    if (authError) {
      // Se for erro de email duplicado, tentar método alternativo
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        return { success: false, error: 'Este email já está cadastrado' }
      }
      throw authError
    }

    if (!authData.user) {
      return { success: false, error: 'Erro ao criar usuário no auth' }
    }

    // Inserir na tabela users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name: data.name,
        role: data.role,
        is_active: true,
      })

    if (insertError) {
      // Tentar deletar usuário do auth se falhar a inserção
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw insertError
    }

    revalidatePath('/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar usuário',
    }
  }
}

interface EditarUsuarioData {
  name: string
  role: UserRole
}

export async function editarUsuario(userId: string, data: EditarUsuarioData) {
  const supabase = await createClient() as SupabaseClient

  // Verificar se o usuário atual é CODE
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'CODE') {
    return { success: false, error: 'Sem permissão para editar usuários' }
  }

  // Não permitir alterar o próprio usuário CODE
  if (userId === user.id) {
    return { success: false, error: 'Não é possível alterar o próprio usuário' }
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        name: data.name,
        role: data.role,
      })
      .eq('id', userId)

    if (error) throw error

    revalidatePath('/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Erro ao editar usuário:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao editar usuário',
    }
  }
}

export async function toggleUsuarioAtivo(userId: string) {
  const supabase = await createClient() as SupabaseClient

  // Verificar se o usuário atual é CODE
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'CODE') {
    return { success: false, error: 'Sem permissão para alterar status de usuários' }
  }

  // Não permitir desativar o próprio usuário
  if (userId === user.id) {
    return { success: false, error: 'Não é possível desativar o próprio usuário' }
  }

  try {
    // Buscar status atual
    const { data: userToToggle } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single()

    const { error } = await supabase
      .from('users')
      .update({ is_active: !userToToggle?.is_active })
      .eq('id', userId)

    if (error) throw error

    revalidatePath('/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status',
    }
  }
}

export async function resetarSenha(userId: string, novaSenha: string) {
  const supabase = await createClient() as SupabaseClient

  // Verificar se o usuário atual é CODE
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Usuário não autenticado' }
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentUser?.role !== 'CODE') {
    return { success: false, error: 'Sem permissão para resetar senhas' }
  }

  if (novaSenha.length < 6) {
    return { success: false, error: 'A senha deve ter pelo menos 6 caracteres' }
  }

  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: novaSenha,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao resetar senha',
    }
  }
}
