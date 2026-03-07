'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getResultadoMensal, getResultadoAcumulado } from '@/actions/financeiro'
import { formatCurrency, formatChips } from '@/lib/formatters'
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Trophy,
  PiggyBank,
  Wallet,
  Loader2,
} from 'lucide-react'

interface ResultadoMensal {
  receitas: {
    rake: number
    rankingColeta: number
    total: number
  }
  despesas: {
    custos: number
    rankingPremios: number
    cashbackAgentes: number
    total: number
  }
  resultadoMes: number
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

export default function ResultadoPage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [resultado, setResultado] = useState<ResultadoMensal | null>(null)
  const [resultadoAcumulado, setResultadoAcumulado] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [mensal, acumulado] = await Promise.all([
      getResultadoMensal(ano, mes),
      getResultadoAcumulado(),
    ])

    setResultado(mensal)
    setResultadoAcumulado(acumulado)
    setLoading(false)
  }, [ano, mes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const anos = Array.from({ length: ano - 2023 + 2 }, (_, i) => 2024 + i)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resultado Financeiro</h1>
          <p className="text-gray-500">Análise de receitas e despesas</p>
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

      {/* Seção Receitas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Receitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
                <Percent className="h-4 w-4" />
                Rake
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatChips(resultado?.receitas.rake || 0)}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
                <Trophy className="h-4 w-4" />
                Ranking (Coletas)
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatChips(resultado?.receitas.rankingColeta || 0)}
              </p>
            </div>

            <div className="p-4 bg-green-100 rounded-lg border-2 border-green-300">
              <div className="text-sm text-green-700 mb-1">Total Receitas</div>
              <p className="text-3xl font-bold text-green-600">
                {formatChips(resultado?.receitas.total || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Despesas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
                <PiggyBank className="h-4 w-4" />
                Custos Operacionais
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(resultado?.despesas.custos || 0)}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
                <Trophy className="h-4 w-4" />
                Ranking (Prêmios)
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatChips(resultado?.despesas.rankingPremios || 0)}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
                <Wallet className="h-4 w-4" />
                Cashback Agentes
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatChips(resultado?.despesas.cashbackAgentes || 0)}
              </p>
            </div>

            <div className="p-4 bg-red-100 rounded-lg border-2 border-red-300">
              <div className="text-sm text-red-700 mb-1">Total Despesas</div>
              <p className="text-3xl font-bold text-red-600">
                {formatChips(resultado?.despesas.total || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Resultado */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-600">Resultado do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-4xl font-bold ${
                (resultado?.resultadoMes || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {(resultado?.resultadoMes || 0) >= 0 ? '+' : ''}
              {formatChips(resultado?.resultadoMes || 0)}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {(resultado?.resultadoMes || 0) >= 0
                ? 'Lucro no período'
                : 'Prejuízo no período'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-600">Resultado Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-4xl font-bold ${
                resultadoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {resultadoAcumulado >= 0 ? '+' : ''}
              {formatChips(resultadoAcumulado)}
            </div>
            <p className="text-sm text-gray-500 mt-2">Desde o início das operações</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
