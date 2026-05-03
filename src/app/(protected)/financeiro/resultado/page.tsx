'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getResultadoMensal, getResultadoAcumulado, getResultadoAnual, type ResultadoAnualMes } from '@/actions/financeiro'
import { formatCurrency, formatChips } from '@/lib/formatters'
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Coins,
  PiggyBank,
  Loader2,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface ResultadoMensal {
  receitas: {
    rakePPPoker: number
    rakeSuprema: number
    total: number
  }
  despesas: {
    custos: number
    total: number
  }
  resultadoMes: number
}

const MESES = [
  { value: 1, label: 'Janeiro', short: 'Jan' },
  { value: 2, label: 'Fevereiro', short: 'Fev' },
  { value: 3, label: 'Março', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Maio', short: 'Mai' },
  { value: 6, label: 'Junho', short: 'Jun' },
  { value: 7, label: 'Julho', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Setembro', short: 'Set' },
  { value: 10, label: 'Outubro', short: 'Out' },
  { value: 11, label: 'Novembro', short: 'Nov' },
  { value: 12, label: 'Dezembro', short: 'Dez' },
]

export default function ResultadoPage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [resultado, setResultado] = useState<ResultadoMensal | null>(null)
  const [resultadoAcumulado, setResultadoAcumulado] = useState(0)
  const [anual, setAnual] = useState<ResultadoAnualMes[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [mensal, acumulado, anualData] = await Promise.all([
      getResultadoMensal(ano, mes),
      getResultadoAcumulado(),
      getResultadoAnual(ano),
    ])

    setResultado(mensal)
    setResultadoAcumulado(acumulado)
    setAnual(anualData)
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

  const chartData = anual.map(m => ({
    mes: MESES[m.mes - 1].short,
    'Rake PPPoker': m.rakePPPoker,
    'Rake Suprema': m.rakeSuprema,
    'Custos': m.custos,
  }))

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
      </div>

      {/* Receitas */}
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
                Rake PPPoker
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatChips(resultado?.receitas.rakePPPoker || 0)}
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-orange-700 mb-1">
                <Coins className="h-4 w-4" />
                Rake Suprema
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(resultado?.receitas.rakeSuprema || 0)}
              </p>
            </div>

            <div className="p-4 bg-green-100 rounded-lg border-2 border-green-300">
              <div className="text-sm text-green-700 mb-1">Total Receitas</div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(resultado?.receitas.total || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
                <PiggyBank className="h-4 w-4" />
                Custos Operacionais
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(resultado?.despesas.custos || 0)}
              </p>
            </div>

            <div className="p-4 bg-red-100 rounded-lg border-2 border-red-300">
              <div className="text-sm text-red-700 mb-1">Total Despesas</div>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(resultado?.despesas.total || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
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
              {formatCurrency(resultado?.resultadoMes || 0)}
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
              {formatCurrency(resultadoAcumulado)}
            </div>
            <p className="text-sm text-gray-500 mt-2">Desde o início das operações</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Anual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            Comparativo Anual — {ano}
          </CardTitle>
          <CardDescription>
            Rake PPPoker, Rake Suprema e Custos Operacionais por mês.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                <Tooltip
                  formatter={(v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="Rake PPPoker" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rake Suprema" fill="#ea580c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custos" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
