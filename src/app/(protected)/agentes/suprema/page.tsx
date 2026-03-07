'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { PlayerSelector } from '@/components/shared/player-selector'
import {
  listarAgentes,
  criarAgente,
  editarAgente,
  excluirAgente,
  adicionarJogadorPasta,
  removerJogadorPasta,
} from '@/actions/agentes'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { toast } from 'sonner'

interface Player {
  id: string
  nick: string
  name: string
  club_id: string
}

interface AgentWithFolder {
  id: string
  platform: 'PPOKER' | 'SUPREMA'
  pct_rakeback: number
  pct_lpbr: number
  is_active: boolean
  player: Player
  players: Player[]
}

export default function AgentesSupremaPage() {
  const [agents, setAgents] = useState<AgentWithFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())

  const [playerId, setPlayerId] = useState('')
  const [pctRakeback, setPctRakeback] = useState('30')
  const [pctLpbr, setPctLpbr] = useState('70')

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await listarAgentes('SUPREMA')
    setAgents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setPlayerId('')
    setPctRakeback('30')
    setPctLpbr('70')
    setEditingId(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (agent: AgentWithFolder) => {
    setEditingId(agent.id)
    setPlayerId(agent.player.id)
    setPctRakeback(agent.pct_rakeback.toString())
    setPctLpbr(agent.pct_lpbr.toString())
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const rakeback = parseFloat(pctRakeback)
    const lpbr = parseFloat(pctLpbr)

    if (rakeback + lpbr !== 100) {
      toast.error('Rakeback% + LPBR% deve ser igual a 100%')
      return
    }

    setSaving(true)

    if (editingId) {
      const result = await editarAgente(editingId, {
        pctRakeback: rakeback,
        pctLpbr: lpbr,
      })

      if (result.success) {
        toast.success('Agente atualizado!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao atualizar')
      }
    } else {
      if (!playerId) {
        toast.error('Selecione um jogador')
        setSaving(false)
        return
      }

      const result = await criarAgente({
        playerId,
        platform: 'SUPREMA',
        pctRakeback: rakeback,
        pctLpbr: lpbr,
      })

      if (result.success) {
        toast.success('Agente criado!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao criar')
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return

    const result = await excluirAgente(id)
    if (result.success) {
      toast.success('Agente excluído!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir')
    }
  }

  const handleAddPlayer = async () => {
    if (!playerId || !selectedAgentId) {
      toast.error('Selecione um jogador')
      return
    }

    setSaving(true)
    const result = await adicionarJogadorPasta(selectedAgentId, playerId, 'SUPREMA')

    if (result.success) {
      toast.success('Jogador adicionado!')
      setAddPlayerOpen(false)
      setPlayerId('')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao adicionar')
    }

    setSaving(false)
  }

  const handleRemovePlayer = async (agentId: string, playerId: string) => {
    if (!confirm('Remover este jogador da pasta?')) return

    const result = await removerJogadorPasta(agentId, playerId)
    if (result.success) {
      toast.success('Jogador removido!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao remover')
    }
  }

  const toggleExpanded = (agentId: string) => {
    const newSet = new Set(expandedAgents)
    if (newSet.has(agentId)) {
      newSet.delete(agentId)
    } else {
      newSet.add(agentId)
    }
    setExpandedAgents(newSet)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agentes Suprema</h1>
          <p className="text-gray-500">{agents.length} agente{agents.length !== 1 ? 's' : ''}</p>
        </div>

        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum agente cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Collapsible
              key={agent.id}
              open={expandedAgents.has(agent.id)}
              onOpenChange={() => toggleExpanded(agent.id)}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-80">
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                          expandedAgents.has(agent.id) ? 'rotate-180' : ''
                        }`}
                      />
                      <div>
                        <CardTitle className="text-lg">{agent.player.nick}</CardTitle>
                        <p className="text-sm text-gray-500">{agent.player.name}</p>
                      </div>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Rakeback: {agent.pct_rakeback}%
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        LPBR: {agent.pct_lpbr}%
                      </Badge>
                      <Badge variant="secondary">
                        {agent.players.length} jogador{agent.players.length !== 1 ? 'es' : ''}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(agent.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <div className="flex items-center justify-between mb-3 pt-3">
                      <h4 className="font-medium text-gray-700">Jogadores na Pasta</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAgentId(agent.id)
                          setPlayerId('')
                          setAddPlayerOpen(true)
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Jogador
                      </Button>
                    </div>

                    {agent.players.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4 text-center">
                        Nenhum jogador na pasta
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {agent.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <span className="font-medium text-sm">{player.nick}</span>
                              <span className="text-gray-500 text-xs ml-2">{player.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                              onClick={() => handleRemovePlayer(agent.id, player.id)}
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Agente' : 'Novo Agente'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize os percentuais do agente' : 'Adicione um novo agente Suprema'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>Jogador</Label>
                <PlayerSelector value={playerId} onSelect={(id) => setPlayerId(id)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rakeback %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pctRakeback}
                  onChange={(e) => {
                    setPctRakeback(e.target.value)
                    setPctLpbr((100 - parseFloat(e.target.value || '0')).toString())
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>LPBR %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pctLpbr}
                  onChange={(e) => {
                    setPctLpbr(e.target.value)
                    setPctRakeback((100 - parseFloat(e.target.value || '0')).toString())
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Jogador à Pasta</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Jogador</Label>
            <PlayerSelector value={playerId} onSelect={(id) => setPlayerId(id)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPlayerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPlayer} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
