'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlayerSelector } from '@/components/shared/player-selector'
import {
  listarControleSuprema,
  adicionarLinhaControle,
  atualizarLinhaControle,
  excluirLinhaControle,
  type ControleSupremaRow,
} from '@/actions/controle-suprema'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { Plus, Trash2, Loader2, Check, Wallet } from 'lucide-react'
import { toast } from 'sonner'

// Estado local de edição de cada linha (mantém o que o usuário digita
// antes de salvar, separado do valor persistido vindo do banco)
interface DraftMap {
  [id: string]: { devedor: string; semana: string }
}

export function ControleSuprema() {
  const [rows, setRows] = useState<ControleSupremaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [newPlayerId, setNewPlayerId] = useState('')
  const [adding, setAdding] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await listarControleSuprema()
    setRows(data)
    setDrafts(
      Object.fromEntries(
        data.map((r) => [
          r.id,
          { devedor: String(r.saldo_devedor), semana: String(r.saldo_semana) },
        ])
      )
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setDraft = (id: string, field: 'devedor' | 'semana', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  // Linha está "suja" se o rascunho difere do valor salvo
  const isDirty = (row: ControleSupremaRow) => {
    const d = drafts[row.id]
    if (!d) return false
    return (
      parseFloat(d.devedor || '0') !== row.saldo_devedor ||
      parseFloat(d.semana || '0') !== row.saldo_semana
    )
  }

  const previewFinal = (id: string) => {
    const d = drafts[id]
    if (!d) return 0
    return (parseFloat(d.devedor || '0') || 0) + (parseFloat(d.semana || '0') || 0)
  }

  const handleSave = async (row: ControleSupremaRow) => {
    const d = drafts[row.id]
    setSavingId(row.id)

    const result = await atualizarLinhaControle(row.id, {
      saldoDevedor: parseFloat(d.devedor || '0') || 0,
      saldoSemana: parseFloat(d.semana || '0') || 0,
    })

    if (result.success) {
      toast.success('Saldos atualizados!')
      await loadData()
    } else {
      toast.error(result.error || 'Erro ao salvar')
    }

    setSavingId(null)
  }

  const handleAdd = async () => {
    if (!newPlayerId) {
      toast.error('Selecione um jogador')
      return
    }

    setAdding(true)
    const result = await adicionarLinhaControle(newPlayerId)

    if (result.success) {
      toast.success('Jogador adicionado à planilha!')
      setAddOpen(false)
      setNewPlayerId('')
      await loadData()
    } else {
      toast.error(result.error || 'Erro ao adicionar')
    }

    setAdding(false)
  }

  const handleDelete = async (row: ControleSupremaRow) => {
    if (!confirm(`Remover ${row.player.nick} da planilha?`)) return

    const result = await excluirLinhaControle(row.id)
    if (result.success) {
      toast.success('Jogador removido!')
      await loadData()
    } else {
      toast.error(result.error || 'Erro ao remover')
    }
  }

  // Total geral da coluna FINAL
  const totalFinal = rows.reduce((acc, r) => acc + r.saldo_final, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Planilha manual de controle de saldos — desvinculada do restante do
          sistema.
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Jogador
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Wallet className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum jogador na planilha</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="w-[160px]">Devedor</TableHead>
                  <TableHead className="w-[160px]">Sem Atual</TableHead>
                  <TableHead className="w-[160px]">Final</TableHead>
                  <TableHead className="w-[180px]">Última atualização</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const dirty = isDirty(row)
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.player.nick}</div>
                        <div className="text-xs text-gray-500">
                          {row.player.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={drafts[row.id]?.devedor ?? ''}
                          onChange={(e) =>
                            setDraft(row.id, 'devedor', e.target.value)
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={drafts[row.id]?.semana ?? ''}
                          onChange={(e) =>
                            setDraft(row.id, 'semana', e.target.value)
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(previewFinal(row.id))}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {dirty ? (
                          <span className="text-amber-600">
                            Alterações não salvas
                          </span>
                        ) : (
                          formatDateTime(row.updated_at)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(row)}
                            disabled={!dirty || savingId === row.id}
                          >
                            {savingId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(row)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {rows.length > 0 && (
        <div className="flex justify-end">
          <div className="text-right">
            <span className="text-sm text-gray-500 mr-3">Total Final:</span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(totalFinal)}
            </span>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Jogador à Planilha</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Jogador</Label>
            <PlayerSelector
              value={newPlayerId}
              onSelect={(id) => setNewPlayerId(id)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
