'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerSelector } from '@/components/shared/player-selector'
import { BankSelector } from '@/components/shared/bank-selector'
import { createClient } from '@/lib/supabase/client'
import {
  listarTransacoesPorData,
  getResumo,
  criarTransacao,
  conciliarTransacao,
  toggleVerified,
  excluirTransacao,
} from '@/actions/conciliacao'
import { formatCurrency, formatChips } from '@/lib/formatters'
import { CAMPOS_POR_TIPO, OPERATION_TYPE_LABELS } from '@/types'
import type { OperationType, Origem } from '@/types'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  Eye,
  Building2,
  Coins,
  Wallet,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'

interface TransactionEntry {
  id: string
  date: string
  operation_type: OperationType | null
  type: string
  chips: number | null
  value: number | null
  origem: Origem | null
  reconciled: boolean
  verified: boolean
  notes: string | null
  has_receipt: boolean
  player: {
    id: string
    nick: string
    name: string
  } | null
  bank: {
    id: string
    name: string
  } | null
}

interface DaySummary {
  fichasEnviadas: number
  fichasRecebidas: number
  fichasSaldo: number
  caixaEntradas: number
  caixaSaidas: number
  caixaSaldo: number
  saldosPorBanco: Array<{ bankId: string; bankName: string; saldo: number }>
}

type FilterType = 'todos' | 'pendentes' | 'conciliados' | 'verificados'

const OPERATION_TYPES: OperationType[] = [
  'COMPRA_FICHAS',
  'CREDITO_FICHAS',
  'SAQUE_FICHAS',
  'CREDITO_PAGAMENTO_DINHEIRO',
  'CREDITO_PAGAMENTO_FICHAS',
  'CUSTO_DESPESA',
  'DEPOSITO_AVULSO',
  'SAQUE_AVULSO',
  'ACORDO_COLETA',
  'RANKING_COLETA',
  'RANKING_PAGAMENTO_FICHAS',
  'RANKING_PAGAMENTO_DINHEIRO',
  'CASHBACK_DINHEIRO',
  'CASHBACK_FICHAS',
  'CASHBACK_PAGAMENTO_DIVIDA',
]

export default function ConciliacaoPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [transactions, setTransactions] = useState<TransactionEntry[]>([])
  const [resumo, setResumo] = useState<DaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conciliarDialogOpen, setConciliarDialogOpen] = useState(false)
  const [transacaoEditando, setTransacaoEditando] = useState<TransactionEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [operationType, setOperationType] = useState<OperationType | ''>('')
  const [playerId, setPlayerId] = useState('')
  const [bankId, setBankId] = useState('')
  const [chips, setChips] = useState('')
  const [value, setValue] = useState('')
  const [origem, setOrigem] = useState<Origem>('MANUAL')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [notes, setNotes] = useState('')
  // Para acordos
  const [playerIdDe, setPlayerIdDe] = useState('')
  const [playerIdPara, setPlayerIdPara] = useState('')

  // Lista de bancos para encontrar o banco CHIPPIX
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([])

  // Carregar bancos para encontrar o CHIPPIX
  useEffect(() => {
    async function loadBanks() {
      const supabase = createClient()
      const { data } = await supabase
        .from('banks')
        .select('id, name')
        .eq('is_active', true)
      setBanks(data || [])
    }
    loadBanks()
  }, [])

  // Encontrar o banco CHIPPIX
  const chippixBankId = useMemo(() => {
    const chippixBank = banks.find(b =>
      b.name.toLowerCase().includes('chippix') ||
      b.name.toLowerCase().includes('chip pix')
    )
    return chippixBank?.id || ''
  }, [banks])

  const loadData = useCallback(async () => {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const [transData, resumoData] = await Promise.all([
      listarTransacoesPorData(dateStr),
      getResumo(dateStr),
    ])

    setTransactions(transData as TransactionEntry[])
    setResumo(resumoData)
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setOperationType('')
    setPlayerId('')
    setBankId('')
    setChips('')
    setValue('')
    setOrigem('MANUAL')
    setHasReceipt(false)
    setNotes('')
    setPlayerIdDe('')
    setPlayerIdPara('')
  }

  const handleSubmit = async () => {
    if (!operationType) {
      toast.error('Selecione um tipo de operação')
      return
    }

    const campos = CAMPOS_POR_TIPO[operationType]

    // Validações
    if (campos.jogador && !campos.acordo && !playerId) {
      toast.error('Selecione um jogador')
      return
    }

    if (campos.acordo && (!playerIdDe || !playerIdPara)) {
      toast.error('Selecione os dois jogadores do acordo')
      return
    }

    if (campos.banco && !bankId) {
      toast.error('Selecione um banco')
      return
    }

    if (campos.fichas && !chips) {
      toast.error('Informe o valor em fichas')
      return
    }

    if (campos.valor && !value) {
      toast.error('Informe o valor em R$')
      return
    }

    setSaving(true)

    const result = await criarTransacao({
      date: format(selectedDate, 'yyyy-MM-dd'),
      operationType,
      playerId: playerId || undefined,
      bankId: bankId || undefined,
      chips: chips ? parseFloat(chips) : undefined,
      value: value ? parseFloat(value) : undefined,
      origem,
      hasReceipt,
      notes: notes || undefined,
      playerIdDe: playerIdDe || undefined,
      playerIdPara: playerIdPara || undefined,
    })

    if (result.success) {
      toast.success('Transação criada com sucesso!')
      setDialogOpen(false)
      resetForm()
      loadData()
    } else {
      toast.error(result.error || 'Erro ao criar transação')
    }

    setSaving(false)
  }

  const handleToggleVerified = async (id: string) => {
    const result = await toggleVerified(id)
    if (result.success) {
      loadData()
    } else {
      toast.error(result.error || 'Erro ao alterar verificação')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    const result = await excluirTransacao(id)
    if (result.success) {
      toast.success('Transação excluída!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir')
    }
  }

  const abrirConciliacao = (tx: TransactionEntry) => {
    setTransacaoEditando(tx)

    // Para transações CHIPPIX, pré-preencher tipo de operação e banco
    if (tx.origem === 'CHIPPIX') {
      // Detectar se é ENVIO ou RECEBIMENTO pelas notes
      const isEnvio = tx.notes?.includes('[ENVIO]')
      const isRecebimento = tx.notes?.includes('[RECEBIMENTO]')

      // ENVIO = jogador recebe fichas = COMPRA_FICHAS
      // RECEBIMENTO = jogador devolve fichas = SAQUE_FICHAS
      if (isEnvio) {
        setOperationType('COMPRA_FICHAS')
      } else if (isRecebimento) {
        setOperationType('SAQUE_FICHAS')
      } else {
        setOperationType(tx.operation_type || '')
      }

      // Pré-selecionar banco CHIPPIX
      setBankId(chippixBankId || tx.bank?.id || '')
    } else {
      // Prefill form with existing values
      setOperationType(tx.operation_type || '')
      setBankId(tx.bank?.id || '')
    }

    setPlayerId(tx.player?.id || '')
    setChips(tx.chips?.toString() || '')
    setValue(tx.value?.toString() || '')
    setOrigem(tx.origem || 'MANUAL')
    setHasReceipt(tx.has_receipt || false)
    setNotes(tx.notes || '')
    setConciliarDialogOpen(true)
  }

  const handleConciliar = async () => {
    if (!transacaoEditando) return
    if (!operationType) {
      toast.error('Selecione um tipo de operação')
      return
    }

    const campos = CAMPOS_POR_TIPO[operationType]

    // Validações
    if (campos.jogador && !campos.acordo && !playerId) {
      toast.error('Selecione um jogador')
      return
    }

    if (campos.banco && !bankId) {
      toast.error('Selecione um banco')
      return
    }

    if (campos.fichas && !chips) {
      toast.error('Informe o valor em fichas')
      return
    }

    if (campos.valor && !value) {
      toast.error('Informe o valor em R$')
      return
    }

    setSaving(true)

    const result = await conciliarTransacao(transacaoEditando.id, {
      operationType,
      playerId: playerId || undefined,
      bankId: bankId || undefined,
      chips: chips ? parseFloat(chips) : undefined,
      value: value ? parseFloat(value) : undefined,
      hasReceipt,
      notes: notes || undefined,
    })

    if (result.success) {
      toast.success('Transação conciliada com sucesso!')
      setConciliarDialogOpen(false)
      setTransacaoEditando(null)
      resetForm()
      loadData()
    } else {
      toast.error(result.error || 'Erro ao conciliar transação')
    }

    setSaving(false)
  }

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'pendentes') return !t.reconciled
    if (filter === 'conciliados') return t.reconciled
    if (filter === 'verificados') return t.verified
    return true
  })

  const campos = operationType ? CAMPOS_POR_TIPO[operationType] : null

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
        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4">
          {/* Fichas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Fichas do Dia</CardTitle>
              <Coins className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Enviadas:</span>
                  <span className="font-mono">{formatChips(resumo?.fichasEnviadas || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Recebidas:</span>
                  <span className="font-mono">{formatChips(resumo?.fichasRecebidas || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-medium">
                  <span>Saldo:</span>
                  <span className="font-mono">{formatChips(resumo?.fichasSaldo || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Caixa */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Caixa do Dia</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Entradas:</span>
                  <span className="font-mono">{formatCurrency(resumo?.caixaEntradas || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Saídas:</span>
                  <span className="font-mono">{formatCurrency(resumo?.caixaSaidas || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-medium">
                  <span>Saldo:</span>
                  <span className="font-mono">{formatCurrency(resumo?.caixaSaldo || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bancos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Saldos por Banco</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1 text-sm max-h-24 overflow-auto">
                {resumo?.saldosPorBanco.map((b) => (
                  <div key={b.bankId} className="flex justify-between">
                    <span className="truncate">{b.bankName}:</span>
                    <span className="font-mono">{formatCurrency(b.saldo)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de transações */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>
                Transações de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <TabsList>
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                  <TabsTrigger value="conciliados">Conciliados</TabsTrigger>
                  <TabsTrigger value="verificados">Verificados</TabsTrigger>
                </TabsList>
              </Tabs>

              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                  <DialogDescription>
                    Cadastre uma nova transação para {format(selectedDate, 'dd/MM/yyyy')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-auto">
                  <div className="space-y-2">
                    <Label>Tipo de Operação</Label>
                    <Select
                      value={operationType}
                      onValueChange={(v) => {
                        setOperationType(v as OperationType)
                        // Reset campos quando mudar tipo
                        setPlayerId('')
                        setBankId('')
                        setChips('')
                        setValue('')
                        setPlayerIdDe('')
                        setPlayerIdPara('')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione...">
                          {operationType ? OPERATION_TYPE_LABELS[operationType] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-[320px]">
                        {OPERATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {OPERATION_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {campos?.acordo ? (
                    <>
                      <div className="space-y-2">
                        <Label>De (quem entrega as fichas)</Label>
                        <PlayerSelector
                          value={playerIdDe}
                          onSelect={(id) => setPlayerIdDe(id)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Para (quem recebe as fichas)</Label>
                        <PlayerSelector
                          value={playerIdPara}
                          onSelect={(id) => setPlayerIdPara(id)}
                        />
                      </div>
                    </>
                  ) : campos?.jogador ? (
                    <div className="space-y-2">
                      <Label>Jogador</Label>
                      <PlayerSelector
                        value={playerId}
                        onSelect={(id) => setPlayerId(id)}
                      />
                    </div>
                  ) : null}

                  {campos?.banco && (
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <BankSelector
                        value={bankId}
                        onSelect={(id) => setBankId(id)}
                      />
                    </div>
                  )}

                  {campos?.fichas && (
                    <div className="space-y-2">
                      <Label>Valor (fichas)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={chips}
                        onChange={(e) => setChips(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  )}

                  {campos?.valor && (
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
                  )}

                  {(operationType === 'COMPRA_FICHAS' || operationType === 'SAQUE_FICHAS') && (
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <Select value={origem} onValueChange={(v) => setOrigem(v as Origem)}>
                        <SelectTrigger>
                          <SelectValue>
                            {origem === 'MANUAL' ? 'Manual' : origem === 'CHIPPIX' ? 'ChipPix' : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANUAL">Manual</SelectItem>
                          <SelectItem value="CHIPPIX">ChipPix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {campos?.comprovante && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hasReceipt"
                        checked={hasReceipt}
                        onCheckedChange={(checked) => setHasReceipt(checked as boolean)}
                      />
                      <Label htmlFor="hasReceipt" className="cursor-pointer">
                        Possui comprovante
                      </Label>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações..."
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving || !operationType}>
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

            {/* Dialog de Conciliação */}
            <Dialog open={conciliarDialogOpen} onOpenChange={(open) => {
              setConciliarDialogOpen(open)
              if (!open) {
                setTransacaoEditando(null)
                resetForm()
              }
            }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Conciliar Transação</DialogTitle>
                  <DialogDescription>
                    Defina o tipo de operação e complete os dados da transação
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-auto">
                  {/* Informações da transação */}
                  {transacaoEditando && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jogador:</span>
                        <span className="font-medium">
                          {transacaoEditando.player?.nick || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fichas:</span>
                        <span className="font-mono">
                          {transacaoEditando.chips ? formatChips(transacaoEditando.chips) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valor:</span>
                        <span className="font-mono">
                          {transacaoEditando.value ? formatCurrency(transacaoEditando.value) : '—'}
                        </span>
                      </div>
                      {transacaoEditando.notes && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Obs:</span>
                          <span>{transacaoEditando.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tipo de Operação</Label>
                    <Select
                      value={operationType}
                      onValueChange={(v) => setOperationType(v as OperationType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione...">
                          {operationType ? OPERATION_TYPE_LABELS[operationType] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-[320px]">
                        {OPERATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {OPERATION_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {campos?.jogador && !campos?.acordo && (
                    <div className="space-y-2">
                      <Label>Jogador</Label>
                      <PlayerSelector
                        value={playerId}
                        onSelect={(id) => setPlayerId(id)}
                      />
                    </div>
                  )}

                  {campos?.banco && (
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <BankSelector
                        value={bankId}
                        onSelect={(id) => setBankId(id)}
                      />
                    </div>
                  )}

                  {campos?.fichas && (
                    <div className="space-y-2">
                      <Label>Valor (fichas)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={chips}
                        onChange={(e) => setChips(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  )}

                  {campos?.valor && (
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
                  )}

                  {campos?.comprovante && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hasReceiptConciliar"
                        checked={hasReceipt}
                        onCheckedChange={(checked) => setHasReceipt(checked as boolean)}
                      />
                      <Label htmlFor="hasReceiptConciliar" className="cursor-pointer">
                        Possui comprovante
                      </Label>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações..."
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setConciliarDialogOpen(false)
                    setTransacaoEditando(null)
                    resetForm()
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConciliar} disabled={saving || !operationType}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conciliando...
                      </>
                    ) : (
                      'Conciliar'
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
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <FileCheck className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhuma transação encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-right">Fichas</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <button
                          onClick={() => handleToggleVerified(tx.id)}
                          className="hover:scale-110 transition-transform"
                          title={tx.verified ? 'Verificado' : 'Não verificado'}
                        >
                          {tx.verified ? (
                            <Eye className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        {tx.operation_type ? (
                          <Badge
                            variant="outline"
                            className={
                              tx.operation_type.includes('COMPRA') ||
                              tx.operation_type.includes('ENVIO') ||
                              tx.operation_type.includes('CREDITO_FICHAS') ||
                              tx.operation_type === 'ACORDO_PAGAMENTO'
                                ? 'text-green-600 border-green-600'
                                : tx.operation_type.includes('SAQUE') ||
                                  tx.operation_type.includes('RECEB') ||
                                  tx.operation_type === 'ACORDO_COLETA'
                                ? 'text-red-600 border-red-600'
                                : ''
                            }
                          >
                            {OPERATION_TYPE_LABELS[tx.operation_type] || tx.operation_type}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.player ? (
                          <div>
                            <span className="font-medium">{tx.player.nick}</span>
                            <span className="text-gray-500 text-sm ml-2">{tx.player.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.chips ? formatChips(tx.chips) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.value ? formatCurrency(tx.value) : '—'}
                      </TableCell>
                      <TableCell>
                        {tx.bank ? (
                          <Badge variant="secondary">{tx.bank.name}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.reconciled ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Conciliado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!tx.reconciled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirConciliacao(tx)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Conciliar
                            </Button>
                          )}
                          {/* Mostrar botão de excluir para pendentes ou transações de ranking */}
                          {(!tx.reconciled || tx.operation_type?.startsWith('RANKING_')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(tx.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
