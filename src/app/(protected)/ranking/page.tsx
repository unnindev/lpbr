'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { listarRankingPorMes, getRankingStats } from '@/actions/ranking'
import { formatChips, formatCurrency } from '@/lib/formatters'
import { Trophy, ArrowDownCircle, ArrowUpCircle, Wallet, Loader2 } from 'lucide-react'

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Ranking</h1>
          <p className="text-gray-500">Controle do pool de ranking</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={mes.toString()}
            onValueChange={(v) => v && setMes(parseInt(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
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
              <SelectValue />
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

      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-4">
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

      {/* Lista de transações */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transações de Ranking - {MESES.find((m) => m.value === mes)?.label} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Trophy className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhuma transação de ranking neste mês</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Fichas</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {format(new Date(tx.date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
