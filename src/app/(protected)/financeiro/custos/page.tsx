'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
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
import { BankSelector } from '@/components/shared/bank-selector'
import {
  listarCustosPorMes,
  getCustosDoMes,
  criarCusto,
  excluirCusto,
} from '@/actions/financeiro'
import { formatCurrency } from '@/lib/formatters'
import { PiggyBank, Plus, Trash2, Loader2, Hash } from 'lucide-react'
import { toast } from 'sonner'

interface CustoEntry {
  id: string
  date: string
  value: number
  notes: string | null
  bank: {
    id: string
    name: string
  } | null
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

export default function CustosPage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [custos, setCustos] = useState<CustoEntry[]>([])
  const [stats, setStats] = useState({ total: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [date, setDate] = useState(format(hoje, 'yyyy-MM-dd'))
  const [descricao, setDescricao] = useState('')
  const [bankId, setBankId] = useState('')
  const [value, setValue] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)

    const [custosData, statsData] = await Promise.all([
      listarCustosPorMes(ano, mes),
      getCustosDoMes(ano, mes),
    ])

    setCustos(custosData)
    setStats(statsData)
    setLoading(false)
  }, [ano, mes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setDate(format(hoje, 'yyyy-MM-dd'))
    setDescricao('')
    setBankId('')
    setValue('')
  }

  const handleSubmit = async () => {
    if (!descricao.trim()) {
      toast.error('Informe a descrição')
      return
    }

    if (!bankId) {
      toast.error('Selecione um banco')
      return
    }

    const valueNum = parseFloat(value)
    if (!valueNum || valueNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setSaving(true)

    const result = await criarCusto({
      date,
      descricao: descricao.trim(),
      bankId,
      value: valueNum,
    })

    if (result.success) {
      toast.success('Custo registrado!')
      setDialogOpen(false)
      resetForm()
      loadData()
    } else {
      toast.error(result.error || 'Erro ao criar custo')
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este custo?')) return

    const result = await excluirCusto(id)
    if (result.success) {
      toast.success('Custo excluído!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir')
    }
  }

  const anos = Array.from({ length: ano - 2023 + 2 }, (_, i) => 2024 + i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custos Operacionais</h1>
          <p className="text-gray-500">Gerencie os custos do clube</p>
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

          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Custo
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Custos</CardTitle>
            <PiggyBank className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(stats.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Lançamentos</CardTitle>
            <Hash className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{stats.count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de custos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Custos de {MESES.find((m) => m.value === mes)?.label} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : custos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <PiggyBank className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum custo registrado neste mês</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custos.map((custo) => (
                  <TableRow key={custo.id}>
                    <TableCell>
                      {format(new Date(custo.date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{custo.notes || '—'}</TableCell>
                    <TableCell>
                      {custo.bank ? (
                        <Badge variant="secondary">{custo.bank.name}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-600">
                      {formatCurrency(custo.value)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(custo.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>Novo Custo</DialogTitle>
            <DialogDescription>Registre um novo custo operacional</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Aluguel, Energia, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Banco</Label>
              <BankSelector value={bankId} onSelect={setBankId} />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
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
    </div>
  )
}
