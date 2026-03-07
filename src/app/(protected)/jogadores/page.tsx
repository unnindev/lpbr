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

  const activeCount = players.filter((p) => p.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jogadores</h1>
          <p className="text-gray-500">
            {activeCount} jogador{activeCount !== 1 ? 'es' : ''} ativo{activeCount !== 1 ? 's' : ''}
          </p>
        </div>

        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Jogador
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nick ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de jogadores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Jogadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum jogador encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código PPPoker</TableHead>
                  <TableHead>Nick</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow
                    key={player.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(player)}
                  >
                    <TableCell className="font-mono">{player.club_id}</TableCell>
                    <TableCell className="font-medium">{player.nick}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell className="text-gray-500 text-sm truncate max-w-xs">
                      {player.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          player.is_active
                            ? 'bg-green-100 text-green-700 cursor-pointer'
                            : 'bg-gray-100 text-gray-500 cursor-pointer'
                        }
                        onClick={(e) => handleToggleAtivo(player.id, e)}
                      >
                        {player.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(player)
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Jogador' : 'Novo Jogador'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os dados do jogador'
                : 'Adicione um novo jogador ao sistema'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>Código PPPoker</Label>
                <Input
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  placeholder="Ex: 1234567"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Nick</Label>
              <Input
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Nick do jogador"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o jogador..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Panorama do Jogador
            </DialogTitle>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedPlayer.nick.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{selectedPlayer.nick}</h3>
                  <p className="text-sm text-gray-500">{selectedPlayer.name}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    Código: {selectedPlayer.club_id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">
                      Total Comprado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-green-600">
                      {formatChips(selectedPlayer.totalComprado)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">
                      Total Sacado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-red-600">
                      {formatChips(selectedPlayer.totalSacado)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">
                      Dívida de Crédito
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-xl font-bold ${selectedPlayer.dividaCredito > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {selectedPlayer.dividaCredito > 0
                        ? formatCurrency(selectedPlayer.dividaCredito)
                        : 'R$ 0,00'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">
                      Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const resultado = selectedPlayer.totalSacado - selectedPlayer.totalComprado
                      const isWinning = resultado > 0
                      return (
                        <div className="flex items-center gap-1">
                          {isWinning ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : resultado < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : null}
                          <p className={`text-xl font-bold ${isWinning ? 'text-green-600' : resultado < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {formatChips(Math.abs(resultado))}
                          </p>
                        </div>
                      )
                    })()}
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedPlayer.totalSacado > selectedPlayer.totalComprado
                        ? 'Jogador está ganhando no longo prazo'
                        : selectedPlayer.totalSacado < selectedPlayer.totalComprado
                        ? 'Jogador está perdendo no longo prazo'
                        : 'Jogador está neutro'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
