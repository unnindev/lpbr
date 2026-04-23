'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listarRankingPorMes, getRankingStats, excluirTransacaoRanking } from '@/actions/ranking'
import { toast } from 'sonner'
import { formatChips, formatCurrency } from '@/lib/formatters'
import { Trophy, ArrowDownCircle, ArrowUpCircle, Wallet, Loader2, Trash2, Printer } from 'lucide-react'

interface RankingTransaction {
  id: string
  date: string
  operation_type: string
  chips: number | null
  value: number | null
  player: {
    id: string
    nick: string
    name: string
  } | null
}

interface RankingStats {
  fichasColetadas: number
  premiosFichas: number
  premiosDinheiro: number
  saldoRanking: number
}

interface DayGroup {
  date: string
  transactions: RankingTransaction[]
  coletasTotal: number
  premiosFichasTotal: number
  premiosDinheiroTotal: number
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

export default function RankingPage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [transactions, setTransactions] = useState<RankingTransaction[]>([])
  const [stats, setStats] = useState<RankingStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [txData, statsData] = await Promise.all([
      listarRankingPorMes(ano, mes),
      getRankingStats(ano, mes),
    ])

    setTransactions(txData)
    setStats(statsData)
    setLoading(false)
  }, [ano, mes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const anos = Array.from({ length: ano - 2023 + 2 }, (_, i) => 2024 + i)

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação de ranking?')) return

    const result = await excluirTransacaoRanking(id)
    if (result.success) {
      toast.success('Transação excluída!')
      loadData()
    } else {
      toast.error(result.error || 'Erro ao excluir')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Agrupar transações por dia com subtotais
  const dayGroups = useMemo<DayGroup[]>(() => {
    const groupsMap = new Map<string, DayGroup>()

    for (const tx of transactions) {
      if (!groupsMap.has(tx.date)) {
        groupsMap.set(tx.date, {
          date: tx.date,
          transactions: [],
          coletasTotal: 0,
          premiosFichasTotal: 0,
          premiosDinheiroTotal: 0,
        })
      }
      const group = groupsMap.get(tx.date)!
      group.transactions.push(tx)

      if (tx.operation_type === 'RANKING_COLETA') {
        group.coletasTotal += tx.chips || 0
      } else if (tx.operation_type === 'RANKING_PAGAMENTO_FICHAS') {
        group.premiosFichasTotal += tx.chips || 0
      } else if (tx.operation_type === 'RANKING_PAGAMENTO_DINHEIRO') {
        group.premiosDinheiroTotal += tx.value || 0
      }
    }

    return Array.from(groupsMap.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions])

  const mesLabel = MESES.find((m) => m.value === mes)?.label

  return (
    <div className="space-y-6">
      {/* Header (oculto no print) */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Ranking</h1>
          <p className="text-gray-500">Controle do pool de ranking</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={loading || transactions.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>

          <Select
            value={mes.toString()}
            onValueChange={(v) => v && setMes(parseInt(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue>{mesLabel}</SelectValue>
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
              <SelectValue>{ano}</SelectValue>
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
      </div>

      {/* Cards de resumo (oculto no print) */}
      <div className="grid grid-cols-4 gap-4 no-print">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Fichas Coletadas (Mês)
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatChips(stats?.fichasColetadas || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Prêmios (Fichas)
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatChips(stats?.premiosFichas || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Prêmios (Dinheiro)
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.premiosDinheiro || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Saldo Ranking (Total)
            </CardTitle>
            <Trophy className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatChips(stats?.saldoRanking || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Área imprimível */}
      <div className="print-area">
        {/* Cabeçalho impressão (visível apenas no print) */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">
            Ranking — {mesLabel} {ano}
          </h1>
        </div>

        <Card>
          <CardHeader className="no-print">
            <CardTitle>
              Transações de Ranking — {mesLabel} {ano}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : dayGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Trophy className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhuma transação de ranking neste mês</p>
              </div>
            ) : (
              <div className="space-y-6">
                {dayGroups.map((group) => (
                  <div key={group.date} className="space-y-2">
                    {/* Cabeçalho do dia */}
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded border-l-4 border-orange-500 print:bg-white print:border-l-0 print:border-b-2 print:border-gray-400 print:rounded-none">
                      <h3 className="font-bold text-gray-900 capitalize">
                        {format(new Date(group.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <div className="flex gap-4 text-sm font-mono">
                        {group.coletasTotal > 0 && (
                          <span className="text-orange-600">
                            Coletas: {formatChips(group.coletasTotal)}
                          </span>
                        )}
                        {group.premiosFichasTotal > 0 && (
                          <span className="text-green-600">
                            Prêmios (Fichas): {formatChips(group.premiosFichasTotal)}
                          </span>
                        )}
                        {group.premiosDinheiroTotal > 0 && (
                          <span className="text-green-600">
                            Prêmios (R$): {formatCurrency(group.premiosDinheiroTotal)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tabela do dia */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Jogador</TableHead>
                          <TableHead className="text-right">Fichas</TableHead>
                          <TableHead className="text-right">Valor (R$)</TableHead>
                          <TableHead className="w-16 no-print"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {tx.operation_type === 'RANKING_COLETA' ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  <ArrowDownCircle className="h-3 w-3 mr-1" />
                                  Coleta
                                </Badge>
                              ) : tx.operation_type === 'RANKING_PAGAMENTO_FICHAS' ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                                  Pagto. Fichas
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  <Wallet className="h-3 w-3 mr-1" />
                                  Pagto. R$
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {tx.player ? (
                                <span className="font-medium">{tx.player.nick}</span>
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
                            <TableCell className="no-print">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(tx.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                {/* Totais do mês (visível no print e na tela) */}
                <div className="mt-6 pt-4 border-t-2 border-gray-300">
                  <h3 className="font-bold text-gray-900 mb-3">Totais do Mês</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="border rounded p-3 print:border-gray-400">
                      <p className="text-gray-600">Fichas Coletadas</p>
                      <p className="text-xl font-bold font-mono text-orange-600">
                        {formatChips(stats?.fichasColetadas || 0)}
                      </p>
                    </div>
                    <div className="border rounded p-3 print:border-gray-400">
                      <p className="text-gray-600">Prêmios em Fichas</p>
                      <p className="text-xl font-bold font-mono text-green-600">
                        {formatChips(stats?.premiosFichas || 0)}
                      </p>
                    </div>
                    <div className="border rounded p-3 print:border-gray-400">
                      <p className="text-gray-600">Prêmios em Dinheiro</p>
                      <p className="text-xl font-bold font-mono text-green-600">
                        {formatCurrency(stats?.premiosDinheiro || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
