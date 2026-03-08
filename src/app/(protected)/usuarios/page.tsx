'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  listarUsuarios,
  criarUsuario,
  editarUsuario,
  toggleUsuarioAtivo,
  resetarSenha,
} from '@/actions/usuarios'
import {
  Users,
  Plus,
  Edit,
  Power,
  Key,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { UserRole } from '@/types'

interface Usuario {
  id: string
  created_at: string
  name: string
  role: UserRole
  is_active: boolean
}

const ROLE_LABELS: Record<UserRole, string> = {
  CODE: 'Desenvolvedor',
  ADMIN: 'Administrador',
  USER: 'Usuário',
}

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  CODE: ShieldAlert,
  ADMIN: ShieldCheck,
  USER: Shield,
}

const ROLE_COLORS: Record<UserRole, string> = {
  CODE: 'text-purple-600 bg-purple-100',
  ADMIN: 'text-blue-600 bg-blue-100',
  USER: 'text-gray-600 bg-gray-100',
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Modal criar
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState<UserRole>('USER')
  const [creating, setCreating] = useState(false)

  // Modal editar
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('USER')
  const [editing, setEditing] = useState(false)

  // Modal resetar senha
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUser, setPasswordUser] = useState<Usuario | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await listarUsuarios()
    setUsuarios(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async () => {
    if (!createEmail || !createPassword || !createName) {
      toast.error('Preencha todos os campos')
      return
    }

    if (createPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setCreating(true)

    const result = await criarUsuario({
      email: createEmail,
      password: createPassword,
      name: createName,
      role: createRole,
    })

    if (result.success) {
      toast.success('Usuário criado com sucesso!')
      setShowCreateModal(false)
      setCreateEmail('')
      setCreatePassword('')
      setCreateName('')
      setCreateRole('USER')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao criar usuário')
    }

    setCreating(false)
  }

  const openEditModal = (user: Usuario) => {
    setEditingUser(user)
    setEditName(user.name)
    setEditRole(user.role)
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!editingUser || !editName) {
      toast.error('Preencha o nome')
      return
    }

    setEditing(true)

    const result = await editarUsuario(editingUser.id, {
      name: editName,
      role: editRole,
    })

    if (result.success) {
      toast.success('Usuário atualizado com sucesso!')
      setShowEditModal(false)
      setEditingUser(null)
      loadData()
    } else {
      toast.error(result.error || 'Erro ao atualizar usuário')
    }

    setEditing(false)
  }

  const handleToggleActive = async (user: Usuario) => {
    const result = await toggleUsuarioAtivo(user.id)

    if (result.success) {
      toast.success(
        user.is_active ? 'Usuário desativado' : 'Usuário ativado'
      )
      loadData()
    } else {
      toast.error(result.error || 'Erro ao alterar status')
    }
  }

  const openPasswordModal = (user: Usuario) => {
    setPasswordUser(user)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const handleResetPassword = async () => {
    if (!passwordUser || !newPassword) {
      toast.error('Digite a nova senha')
      return
    }

    setResetting(true)

    const result = await resetarSenha(passwordUser.id, newPassword)

    if (result.success) {
      toast.success('Senha resetada com sucesso!')
      setShowPasswordModal(false)
      setPasswordUser(null)
      setNewPassword('')
    } else {
      toast.error(result.error || 'Erro ao resetar senha')
    }

    setResetting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-500">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((user) => {
                  const RoleIcon = ROLE_ICONS[user.role]
                  return (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[user.role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(user)}
                            title="Editar"
                            disabled={user.role === 'CODE'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordModal(user)}
                            title="Resetar senha"
                            disabled={user.role === 'CODE'}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active ? 'Desativar' : 'Ativar'}
                            disabled={user.role === 'CODE'}
                            className={user.is_active ? 'text-red-500' : 'text-green-500'}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Usuário */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={createRole}
                onValueChange={(v) => v && setCreateRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {createRole === 'USER' ? 'Usuário' : createRole === 'ADMIN' ? 'Administrador' : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuário */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={editRole}
                onValueChange={(v) => v && setEditRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {editRole === 'USER' ? 'Usuário' : editRole === 'ADMIN' ? 'Administrador' : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editing}>
              {editing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Resetar Senha */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">
              Digite uma nova senha para o usuário{' '}
              <strong>{passwordUser?.name}</strong>
            </p>

            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Resetar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
