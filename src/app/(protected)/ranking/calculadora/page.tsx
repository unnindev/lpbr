'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { PlayerSelector } from '@/components/shared/player-selector'
import { BankSelector } from '@/components/shared/bank-selector'
import { confirmarColetas, confirmarPagamentos } from '@/actions/ranking'
import { formatChips, formatCurrency } from '@/lib/formatters'
import { Calculator, Plus, Trash2, Loader2, Trophy, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ColetaLine {
  id: string
  playerId: string
  playerNick: string
  premio: string
}

interface PagamentoLine {
  id: string
  playerId: string
  playerNick: string
  modalidade: 'FICHAS' | 'DINHEIRO' | 'ABATE_DIVIDA'
  valor: string
}

export default function CalculadoraPage() {
  const hoje = new Date()
  const [date, setDate] = useState(format(hoje, 'yyyy-MM-dd'))
  const [percentual, setPercentual] = useState('10')
  const [coletas, setColetas] = useState<ColetaLine[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoLine[]>([])
  const [bankId, setBankId] = useState('')
  const [savingColetas, setSavingColetas] = useState(false)
  const [savingPagamentos, setSavingPagamentos] = useState(false)

  // Adicionar linha de coleta
  const addColetaLine = () => {
    setColetas([
      ...coletas,
      { id: crypto.randomUUID(), playerId: '', playerNick: '', premio: '' },
    ])
  }

  const removeColetaLine = (id: string) => {
    setColetas(coletas.filter((c) => c.id !== id))
  }

  const updateColeta = (id: string, field: keyof ColetaLine, value: string) => {
    setColetas(
      coletas.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  // Adicionar linha de pagamento
  const addPagamentoLine = () => {
    setPagamentos([
      ...pagamentos,
      {
        id: crypto.randomUUID(),
        playerId: '',
        playerNick: '',
        modalidade: 'FICHAS',
        valor: '',
      },
    ])
  }

  const removePagamentoLine = (id: string) => {
    setPagamentos(pagamentos.filter((p) => p.id !== id))
  }

  const updatePagamento = (id: string, field: keyof PagamentoLine, value: string) => {
    setPagamentos(
      pagamentos.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  // Calcular valor a coletar
  const calcularColeta = (premio: string) => {
    const premioNum = parseFloat(premio) || 0
    const pctNum = parseFloat(percentual) || 0
    return premioNum * (pctNum / 100)
  }

  // Total de coletas
  const totalColetas = coletas.reduce((acc, c) => acc + calcularColeta(c.premio), 0)

  // Total de pagamentos
  const totalPagamentos = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)

  const handleConfirmarColetas = async () => {
    const validColetas = coletas.filter((c) => c.playerId && parseFloat(c.premio) > 0)
    if (validColetas.length === 0) {
      toast.error('Adicione pelo menos uma coleta válida')
      return
    }

    setSavingColetas(true)

    const result = await confirmarColetas({
      date,
      coletas: validColetas.map((c) => ({
        playerId: c.playerId,
        premio: parseFloat(c.premio),
        percentual: parseFloat(percentual),
      })),
    })

    if (result.success) {
      toast.success('Coletas confirmadas com sucesso!')
      setColetas([])
    } else {
      toast.error(result.error || 'Erro ao confirmar coletas')
    }

    setSavingColetas(false)
  }

  const handleConfirmarPagamentos = async () => {
    const validPagamentos = pagamentos.filter((p) => p.playerId && parseFloat(p.valor) > 0)
    if (validPagamentos.length === 0) {
      toast.error('Adicione pelo menos um pagamento válido')
      return
    }

    // Verificar se tem pagamento em dinheiro sem banco
    const temDinheiroSemBanco = validPagamentos.some(
      (p) => p.modalidade === 'DINHEIRO' && !bankId
    )
    if (temDinheiroSemBanco) {
      toast.error('Selecione um banco para pagamentos em dinheiro')
      return
    }

    setSavingPagamentos(true)

    const result = await confirmarPagamentos({
      date,
      pagamentos: validPagamentos.map((p) => ({
        playerId: p.playerId,
        modalidade: p.modalidade,
        valor: parseFloat(p.valor),
        bankId: p.modalidade === 'DINHEIRO' ? bankId : undefined,
      })),
    })

    if (result.success) {
      toast.success('Pagamentos confirmados com sucesso!')
      setPagamentos([])
    } else {
      toast.error(result.error || 'Erro ao confirmar pagamentos')
    }

    setSavingPagamentos(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calculadora de Ranking</h1>
          <p className="text-gray-500">Registre coletas e pagamentos do ranking</p>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-500">Data:</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Seção Coleta */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-600" />
                Coleta de Ranking
              </CardTitle>
              <CardDescription>
                Registre o percentual coletado dos prêmios dos jogadores
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Percentual:</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  className="w-20"
                />
                <span className="text-gray-500">%</span>
              </div>
              <Button variant="outline" onClick={addColetaLine}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Jogador
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coletas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Clique em &quot;Adicionar Jogador&quot; para começar</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Jogador</TableHead>
                    <TableHead className="text-right">Prêmio Ganho</TableHead>
                    <TableHead className="text-right">Valor a Coletar ({percentual}%)</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coletas.map((coleta) => (
                    <TableRow key={coleta.id}>
                      <TableCell>
                        <PlayerSelector
                          value={coleta.playerId}
                          onSelect={(id, player) => {
                            updateColeta(coleta.id, 'playerId', id)
                            updateColeta(coleta.id, 'playerNick', player?.nick || '')
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={coleta.premio}
                          onChange={(e) => updateColeta(coleta.id, 'premio', e.target.value)}
                          placeholder="0,00"
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-orange-600">
                        {formatChips(calcularColeta(coleta.premio))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColetaLine(coleta.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-lg font-medium">
                  Total a coletar:{' '}
                  <span className="text-orange-600">{formatChips(totalColetas)}</span>
                </div>
                <Button onClick={handleConfirmarColetas} disabled={savingColetas}>
                  {savingColetas ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Coletas
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seção Pagamento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                Pagamento de Ranking
              </CardTitle>
              <CardDescription>
                Registre os pagamentos de prêmios do ranking
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Banco (para R$):</Label>
                <div className="w-40">
                  <BankSelector
                    value={bankId}
                    onSelect={setBankId}
                    placeholder="Selecione..."
                  />
                </div>
              </div>
              <Button variant="outline" onClick={addPagamentoLine}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pagamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pagamentos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Clique em &quot;Adicionar Pagamento&quot; para começar</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Jogador</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos.map((pag) => (
                    <TableRow key={pag.id}>
                      <TableCell>
                        <PlayerSelector
                          value={pag.playerId}
                          onSelect={(id, player) => {
                            updatePagamento(pag.id, 'playerId', id)
                            updatePagamento(pag.id, 'playerNick', player?.nick || '')
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pag.modalidade}
                          onValueChange={(v) => {
                            if (v) updatePagamento(pag.id, 'modalidade', v)
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FICHAS">Fichas</SelectItem>
                            <SelectItem value="DINHEIRO">Dinheiro (R$)</SelectItem>
                            <SelectItem value="ABATE_DIVIDA">Abate Dívida</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pag.valor}
                          onChange={(e) => updatePagamento(pag.id, 'valor', e.target.value)}
                          placeholder="0,00"
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePagamentoLine(pag.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-lg font-medium">
                  Total a pagar:{' '}
                  <span className="text-green-600">{formatChips(totalPagamentos)}</span>
                </div>
                <Button onClick={handleConfirmarPagamentos} disabled={savingPagamentos}>
                  {savingPagamentos ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Pagamentos
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
