'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  listarJogadores,
  getJogadorComEstatisticas,
  criarJogador,
  editarJogador,
  toggleJogadorAtivo,
  excluirJogador,
} from '@/actions/jogadores'
import { formatChips, formatCurrency } from '@/lib/formatters'
import {
  Users,
  Plus,
  Pencil,
  Search,
  Loader2,
  UserCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Player {
  id: string
  club_id: string
  nick: string
  name: string
  notes: string | null
  is_active: boolean
}

interface PlayerStats {
  id: string
  club_id: string
  nick: string
  name: string
  notes: string | null
  is_active: boolean
  totalComprado: number
  totalSacado: number
  dividaCredito: number
  usaChippix: boolean
}

export default function JogadoresPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [clubId, setClubId] = useState('')
  const [nick, setNick] = useState('')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await listarJogadores(search || undefined)
    setPlayers(data)
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  const resetForm = () => {
    setClubId('')
    setNick('')
    setName('')
    setNotes('')
    setEditingId(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (player: Player) => {
    setEditingId(player.id)
    setClubId(player.club_id)
    setNick(player.nick)
    setName(player.name)
    setNotes(player.notes || '')
    setDialogOpen(true)
  }

  const handleRowClick = async (player: Player) => {
    const stats = await getJogadorComEstatisticas(player.id)
    if (stats) {
      setSelectedPlayer(stats)
      setDetailsOpen(true)
    }
  }

  const handleSubmit = async () => {
    if (!nick.trim() || !name.trim()) {
      toast.error('Nick e Nome são obrigatórios')
      return
    }

    setSaving(true)

    if (editingId) {
      const result = await editarJogador(editingId, {
        nick: nick.trim(),
        name: name.trim(),
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        toast.success('Jogador atualizado com sucesso!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao atualizar jogador')
      }
    } else {
      if (!clubId.trim()) {
        toast.error('Código PPPoker é obrigatório')
        setSaving(false)
        return
      }

      const result = await criarJogador({
        club_id: clubId.trim(),
        nick: nick.trim(),
        name: name.trim(),
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        toast.success('Jogador criado com sucesso!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao criar jogador')
      }
    }

    setSaving(false)
  }

  const handleToggleAtivo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await toggleJogadorAtivo(id)
    if (result.success) {
      loadData()
    } else {
      toast.error(result.error || 'Erro ao alterar status')
    }
  }

  const handleDelete = async (id: string, nick: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja excluir o jogador "${nick}"?`)) return

    const result = await excluirJogador(id)
    if (result.success) {
      toast.success('Jogador excluído com sucesso!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir jogador')
    }
  }

  const activeCount = players.filter((p) => p.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Jogadores</h1>
          <p className="text-gray-500 mt-1">
            {activeCount} jogador{activeCount !== 1 ? 'es' : ''} ativo{activeCount !== 1 ? 's' : ''}
          </p>
        </div>

        <Button onClick={handleOpenNew} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Novo Jogador
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar por código, nick ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 text-base bg-white border-gray-200 shadow-sm"
        />
      </div>

      {/* Lista de jogadores */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-gray-500" />
            Lista de Jogadores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">Nenhum jogador encontrado</p>
              <p className="text-sm text-gray-400 mt-1">Tente ajustar sua busca</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Código PPPoker</TableHead>
                    <TableHead className="font-semibold">Nick</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Observação</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow
                      key={player.id}
                      className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                      onClick={() => handleRowClick(player)}
                    >
                      <TableCell className="font-mono text-sm">{player.club_id}</TableCell>
                      <TableCell className="font-semibold">{player.nick}</TableCell>
                      <TableCell className="text-gray-600">{player.name}</TableCell>
                      <TableCell className="text-gray-400 text-sm truncate max-w-xs">
                        {player.notes || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            player.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer font-medium'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer font-medium'
                          }
                          onClick={(e) => handleToggleAtivo(player.id, e)}
                        >
                          {player.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(player)
                            }}
                            className="text-gray-400 hover:text-gray-700 h-9 w-9"
                            title="Editar jogador"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(player.id, player.nick, e)}
                            className="text-red-400 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                            title="Excluir jogador"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingId ? 'Editar Jogador' : 'Novo Jogador'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os dados do jogador'
                : 'Adicione um novo jogador ao sistema'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {!editingId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Código PPPoker</Label>
                <Input
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  placeholder="Ex: 1234567"
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Nick</Label>
              <Input
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Nick do jogador"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o jogador..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="h-11">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingId ? (
                'Atualizar'
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserCircle className="h-6 w-6 text-primary" />
              Panorama do Jogador
            </DialogTitle>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {selectedPlayer.nick.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedPlayer.nick}</h3>
                  <p className="text-sm text-gray-500">{selectedPlayer.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Código: {selectedPlayer.club_id}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={selectedPlayer.usaChippix
                    ? 'border-green-500 text-green-700 bg-green-50'
                    : 'border-gray-300 text-gray-500 bg-white'}
                >
                  {selectedPlayer.usaChippix ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                  )}
                  ChipPix
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Comprado</p>
                  <p className="text-2xl font-bold text-green-600 tracking-tight">
                    {formatChips(selectedPlayer.totalComprado)}
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Sacado</p>
                  <p className="text-2xl font-bold text-red-600 tracking-tight">
                    {formatChips(selectedPlayer.totalSacado)}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">Dívida de Crédito</p>
                  <p className={`text-2xl font-bold tracking-tight ${selectedPlayer.dividaCredito > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                    {selectedPlayer.dividaCredito > 0
                      ? formatCurrency(selectedPlayer.dividaCredito)
                      : 'R$ 0,00'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">Resultado</p>
                  {(() => {
                    const resultado = selectedPlayer.totalSacado - selectedPlayer.totalComprado
                    const isWinning = resultado > 0
                    return (
                      <>
                        <div className="flex items-center gap-1.5">
                          {isWinning ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : resultado < 0 ? (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          ) : null}
                          <p className={`text-2xl font-bold tracking-tight ${isWinning ? 'text-green-600' : resultado < 0 ? 'text-red-600' : 'text-gray-300'}`}>
                            {formatChips(Math.abs(resultado))}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {resultado > 0
                            ? 'Ganhando no longo prazo'
                            : resultado < 0
                            ? 'Perdendo no longo prazo'
                            : 'Neutro'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} className="h-11 w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
