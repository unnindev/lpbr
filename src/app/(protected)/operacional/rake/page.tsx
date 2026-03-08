'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  listarRakePorMes,
  getRakeDoMes,
  getRakeAcumulado,
  criarRake,
  editarRake,
  excluirRake,
} from '@/actions/rake'
import { formatChips } from '@/lib/formatters'
import { getCompetencia } from '@/lib/competencia'
import { Percent, TrendingUp, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RakeEntry {
  id: string
  date: string
  chips: number
  competencia: string | null
  notes: string | null
}

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

export default function RakePage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [rakes, setRakes] = useState<RakeEntry[]>([])
  const [rakeMes, setRakeMes] = useState(0)
  const [rakeAcumulado, setRakeAcumulado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [date, setDate] = useState(format(hoje, 'yyyy-MM-dd'))
  const [chips, setChips] = useState('')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)

    const [rakesData, rakeMesData, rakeAcumData] = await Promise.all([
      listarRakePorMes(ano, mes),
      getRakeDoMes(ano, mes),
      getRakeAcumulado(),
    ])

    setRakes(rakesData)
    setRakeMes(rakeMesData)
    setRakeAcumulado(rakeAcumData)
    setLoading(false)
  }, [ano, mes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setDate(format(hoje, 'yyyy-MM-dd'))
    setChips('')
    setNotes('')
    setEditingId(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (rake: RakeEntry) => {
    setEditingId(rake.id)
    setDate(rake.date)
    setChips(rake.chips.toString())
    setNotes(rake.notes || '')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const chipsValue = parseFloat(chips)
    if (!chipsValue || chipsValue <= 0) {
      toast.error('Informe um valor de rake válido')
      return
    }

    setSaving(true)

    if (editingId) {
      const result = await editarRake(editingId, {
        chips: chipsValue,
        notes: notes || undefined,
      })

      if (result.success) {
        toast.success('Rake atualizado com sucesso!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao atualizar rake')
      }
    } else {
      const result = await criarRake({
        date,
        chips: chipsValue,
        notes: notes || undefined,
      })

      if (result.success) {
        toast.success('Rake registrado com sucesso!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao criar rake')
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este rake?')) return

    const result = await excluirRake(id)

    if (result.success) {
      toast.success('Rake excluído com sucesso!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir rake')
    }
  }

  const competenciaPreview = date ? getCompetencia(new Date(date + 'T12:00:00')) : ''

  // Gerar anos disponíveis (2024 até ano atual + 1)
  const anos = Array.from({ length: ano - 2023 + 2 }, (_, i) => 2024 + i)

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rake</h1>
          <p className="text-gray-500">Gerencie o rake coletado</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={mes.toString()}
              onValueChange={(v) => v && setMes(parseInt(v))}
            >
              <SelectTrigger className="w-36">
                <SelectValue>
                  {MESES.find(m => m.value === mes)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={ano.toString()}
              onValueChange={(v) => v && setAno(parseInt(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue>
                  {ano}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Rake
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Rake do Mês ({MESES.find((m) => m.value === mes)?.label})
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Percent className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatChips(rakeMes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Rake Acumulado (Total)
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatChips(rakeAcumulado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de rakes */}
      <Card>
        <CardHeader>
          <CardTitle>
            Registros de {MESES.find((m) => m.value === mes)?.label} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : rakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Percent className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum rake registrado neste mês</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead className="text-right">Valor (Fichas)</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rakes.map((rake) => (
                  <TableRow key={rake.id}>
                    <TableCell>
                      {format(new Date(rake.date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{rake.competencia || '—'}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatChips(rake.chips)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm truncate max-w-xs">
                      {rake.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rake)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rake.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Rake' : 'Novo Rake'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os dados do rake'
                : 'Registre um novo valor de rake'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                {competenciaPreview && (
                  <p className="text-xs text-gray-500">
                    Competência: {competenciaPreview}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor (Fichas)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={chips}
                onChange={(e) => setChips(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre este rake..."
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
    </div>
  )
}
