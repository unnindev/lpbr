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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Crédito Concedido</h1>
          <p className="text-gray-500 mt-1">Jogadores com dívidas de crédito pendentes</p>
        </div>
      </div>

      {/* Card Total */}
      <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-amber-700/70">
            Total em Crédito Pendente
          </CardTitle>
          <div className="p-3 rounded-xl bg-amber-100">
            <CreditCard className="h-5 w-5 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-3xl lg:text-4xl font-bold text-amber-600 tracking-tight">
            {formatChips(totalCredito)}
          </div>
          <p className="text-sm text-amber-600/60 mt-2">
            Soma de todas as dívidas de crédito
          </p>
        </CardContent>
      </Card>

      {/* Lista de jogadores */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Jogadores com Crédito
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : jogadores.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Nenhum jogador com crédito pendente</p>
              <p className="text-sm text-gray-400 mt-1">Todos os créditos foram quitados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">Nick</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="text-right font-semibold">Dívida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jogadores.map((item) => (
                    <TableRow
                      key={item.player.id}
                      className="cursor-pointer hover:bg-amber-50/50 transition-colors"
                      onClick={() => abrirHistorico(item)}
                    >
                      <TableCell className="font-semibold">{item.player.nick}</TableCell>
                      <TableCell className="text-gray-500">{item.player.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-lg font-bold text-amber-600">
                          {formatChips(item.divida)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Histórico */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-6 w-6 text-primary" />
              Histórico de Crédito
            </DialogTitle>
            {jogadorSelecionado && (
              <div className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-600">
                    {jogadorSelecionado.player.nick.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{jogadorSelecionado.player.nick}</p>
                  <p className="text-sm text-gray-500">{jogadorSelecionado.player.name}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-sm font-semibold">
                  Dívida: {formatChips(jogadorSelecionado.divida)}
                </Badge>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto -mx-6 px-6">
            {loadingHistorico ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum registro encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Operação</TableHead>
                    <TableHead className="text-right font-semibold">Valor</TableHead>
                    <TableHead className="text-right font-semibold">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoComSaldo.map((tx) => {
                    const isCredito = tx.operation_type === 'CREDITO_FICHAS'
                    const valor = tx.chips || tx.value || 0

                    return (
                      <TableRow key={tx.id} className="hover:bg-gray-50/50">
                        <TableCell>
                          {isCredito ? (
                            <ArrowUpCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(tx.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={isCredito ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}
                          >
                            {OPERATION_LABELS[tx.operation_type] || tx.operation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          <span className={isCredito ? 'text-red-600' : 'text-green-600'}>
                            {isCredito ? '+' : '-'}
                            {tx.chips ? formatChips(valor) : formatCurrency(valor)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-gray-700">
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
