'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
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
import { PlayerSelector } from '@/components/shared/player-selector'
import { criarLog, listarLogsPorData, getFichasCirculacao, excluirLog } from '@/actions/log'
import { formatCurrency, formatChips } from '@/lib/formatters'
import { Coins, Plus, Trash2, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LogEntry {
  id: string
  date: string
  chips: number
  value: number | null
  origem: 'MANUAL' | 'CHIPPIX'
  notes: string | null
  reconciled: boolean
  player: {
    id: string
    club_id: string
    nick: string
    name: string
  } | null
}

export default function LogPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fichasCirculacao, setFichasCirculacao] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [tipo, setTipo] = useState<'ENVIO' | 'RECEBIMENTO'>('ENVIO')
  const [playerId, setPlayerId] = useState('')
  const [chips, setChips] = useState('')
  const [origem, setOrigem] = useState<'MANUAL' | 'CHIPPIX'>('MANUAL')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const [logsData, fichas] = await Promise.all([
      listarLogsPorData(dateStr),
      getFichasCirculacao(),
    ])

    setLogs(logsData as LogEntry[])
    setFichasCirculacao(fichas)
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setTipo('ENVIO')
    setPlayerId('')
    setChips('')
    setOrigem('MANUAL')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!playerId) {
      toast.error('Selecione um jogador')
      return
    }

    const chipsValue = parseFloat(chips)
    if (!chipsValue || chipsValue <= 0) {
      toast.error('Informe um valor de fichas válido')
      return
    }

    setSaving(true)

    const result = await criarLog({
      tipo,
      playerId,
      chips: chipsValue,
      origem,
      date: format(selectedDate, 'yyyy-MM-dd'),
      notes: notes || undefined,
    })

    if (result.success) {
      toast.success('Log criado com sucesso!')
      setDialogOpen(false)
      resetForm()
      loadData()
    } else {
      toast.error(result.error || 'Erro ao criar log')
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este log?')) return

    const result = await excluirLog(id)

    if (result.success) {
      toast.success('Log excluído com sucesso!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir log')
    }
  }

  const getTipoFromNotes = (notes: string | null): 'ENVIO' | 'RECEBIMENTO' => {
    if (!notes) return 'ENVIO'
    if (notes.includes('[ENVIO]')) return 'ENVIO'
    if (notes.includes('[RECEBIMENTO]')) return 'RECEBIMENTO'
    return 'ENVIO'
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Lado esquerdo - Calendário */}
      <div className="w-80 shrink-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selecionar Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      {/* Lado direito */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Card de Fichas em Circulação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Atual de Fichas em Circulação
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <Coins className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatChips(fichasCirculacao)}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Logs */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>
                Logs de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {logs.length} registro{logs.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Log
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Log</DialogTitle>
                  <DialogDescription>
                    Registre uma movimentação de fichas para {format(selectedDate, 'dd/MM/yyyy')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Tipo - Botões toggle */}
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={tipo === 'ENVIO' ? 'default' : 'outline'}
                        className={`h-12 ${tipo === 'ENVIO' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={() => setTipo('ENVIO')}
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                        Envio
                      </Button>
                      <Button
                        type="button"
                        variant={tipo === 'RECEBIMENTO' ? 'default' : 'outline'}
                        className={`h-12 ${tipo === 'RECEBIMENTO' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        onClick={() => setTipo('RECEBIMENTO')}
                      >
                        <ArrowDownCircle className="h-4 w-4 mr-2" />
                        Recebimento
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {tipo === 'ENVIO' ? 'Jogador recebe fichas' : 'Jogador devolve fichas'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Jogador</Label>
                    <PlayerSelector
                      value={playerId}
                      onSelect={(id) => setPlayerId(id)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor (fichas)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={chips}
                      onChange={(e) => setChips(e.target.value)}
                      placeholder="0,00"
                      className="h-11"
                    />
                  </div>

                  {/* Origem - Botões toggle */}
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={origem === 'MANUAL' ? 'default' : 'outline'}
                        className="h-11"
                        onClick={() => setOrigem('MANUAL')}
                      >
                        Manual
                      </Button>
                      <Button
                        type="button"
                        variant={origem === 'CHIPPIX' ? 'default' : 'outline'}
                        className="h-11"
                        onClick={() => setOrigem('CHIPPIX')}
                      >
                        ChipPix
                      </Button>
                    </div>
                    {origem === 'CHIPPIX' && chips && (
                      <p className="text-xs text-gray-500">
                        Valor em R$: {formatCurrency(
                          tipo === 'ENVIO'
                            ? parseFloat(chips) - 0.5
                            : parseFloat(chips) + 0.5
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações sobre esta movimentação..."
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
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Coins className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum log registrado nesta data</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-right">Fichas</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const tipoLog = getTipoFromNotes(log.notes)
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {tipoLog === 'ENVIO' ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Envio
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Receb.
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.player ? (
                            <div>
                              <span className="font-medium">{log.player.nick}</span>
                              <span className="text-gray-500 text-sm ml-2">{log.player.name}</span>
                              <span className="text-gray-400 text-xs ml-1">({log.player.club_id})</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatChips(log.chips)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {log.value ? formatCurrency(log.value) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.origem === 'CHIPPIX' ? 'secondary' : 'outline'}>
                            {log.origem}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.reconciled ? (
                            <Badge className="bg-green-100 text-green-700">Conciliado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!log.reconciled && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(log.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
