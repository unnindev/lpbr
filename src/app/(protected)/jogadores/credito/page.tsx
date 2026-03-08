'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { getJogadoresComCredito, getTotalCredito, getHistoricoCreditoJogador } from '@/actions/jogadores'
import { formatChips, formatCurrency } from '@/lib/formatters'
import { CreditCard, Loader2, AlertTriangle, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react'

interface JogadorComCredito {
  player: {
    id: string
    nick: string
    name: string
  }
  divida: number
}

interface TransacaoCredito {
  id: string
  date: string
  operation_type: string
  chips: number | null
  value: number | null
  notes: string | null
}

const OPERATION_LABELS: Record<string, string> = {
  'CREDITO_FICHAS': 'Crédito Concedido',
  'CREDITO_PAGAMENTO_FICHAS': 'Pagamento (Fichas)',
  'CREDITO_PAGAMENTO_DINHEIRO': 'Pagamento (Dinheiro)',
}

export default function CreditoPage() {
  const [jogadores, setJogadores] = useState<JogadorComCredito[]>([])
  const [totalCredito, setTotalCredito] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [jogadorSelecionado, setJogadorSelecionado] = useState<JogadorComCredito | null>(null)
  const [historico, setHistorico] = useState<TransacaoCredito[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [jogadoresData, total] = await Promise.all([
      getJogadoresComCredito(),
      getTotalCredito(),
    ])
    setJogadores(jogadoresData)
    setTotalCredito(total)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const abrirHistorico = async (jogador: JogadorComCredito) => {
    setJogadorSelecionado(jogador)
    setDialogOpen(true)
    setLoadingHistorico(true)

    const data = await getHistoricoCreditoJogador(jogador.player.id)
    setHistorico(data)
    setLoadingHistorico(false)
  }

  // Calcular saldo acumulado para cada transação (de trás pra frente)
  const historicoComSaldo = historico.map((tx, index) => {
    // Calcular saldo após esta transação
    let saldoApos = 0
    for (let i = index; i < historico.length; i++) {
      const t = historico[i]
      if (t.operation_type === 'CREDITO_FICHAS') {
        saldoApos += t.chips || 0
      } else {
        saldoApos -= (t.chips || t.value || 0)
      }
    }
    return { ...tx, saldoApos }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crédito Concedido</h1>
          <p className="text-gray-500">Jogadores com dívidas de crédito pendentes</p>
        </div>
      </div>

      {/* Card Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Total em Crédito Pendente
          </CardTitle>
          <div className="p-2 rounded-lg bg-amber-50">
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-amber-600">
            {formatChips(totalCredito)}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Soma de todas as dívidas de crédito
          </p>
        </CardContent>
      </Card>

      {/* Lista de jogadores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Jogadores com Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : jogadores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum jogador com crédito pendente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nick</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Dívida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jogadores.map((item) => (
                  <TableRow
                    key={item.player.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => abrirHistorico(item)}
                  >
                    <TableCell className="font-medium">{item.player.nick}</TableCell>
                    <TableCell className="text-gray-500">{item.player.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-bold text-amber-600">
                        {formatChips(item.divida)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Histórico */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Crédito
            </DialogTitle>
            <DialogDescription>
              {jogadorSelecionado && (
                <span>
                  <strong>{jogadorSelecionado.player.nick}</strong> - {jogadorSelecionado.player.name}
                  <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
                    Dívida atual: {formatChips(jogadorSelecionado.divida)}
                  </Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loadingHistorico ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum registro encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoComSaldo.map((tx) => {
                    const isCredito = tx.operation_type === 'CREDITO_FICHAS'
                    const valor = tx.chips || tx.value || 0

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {isCredito ? (
                            <ArrowUpCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(tx.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={isCredito ? 'text-red-600 border-red-300' : 'text-green-600 border-green-300'}
                          >
                            {OPERATION_LABELS[tx.operation_type] || tx.operation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={isCredito ? 'text-red-600' : 'text-green-600'}>
                            {isCredito ? '+' : '-'}
                            {tx.chips ? formatChips(valor) : formatCurrency(valor)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatChips(tx.saldoApos)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
