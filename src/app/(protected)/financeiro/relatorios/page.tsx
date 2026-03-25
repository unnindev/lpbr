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
import { getEstatisticasSegmentadas, getEstatisticasAcumuladasSegmentadas } from '@/actions/relatorios'
import { formatChips } from '@/lib/formatters'
import {
  BarChart3,
  Loader2,
  Smartphone,
  HandCoins,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react'

interface CategoriaEstatisticas {
  quantidade: number
  fichasEnviadas: number
  fichasRecebidas: number
  totalFichas: number
}

interface EstatisticasSegmentadas {
  chippix: CategoriaEstatisticas
  manual: CategoriaEstatisticas
  ranking: CategoriaEstatisticas
  rakeSemanal: CategoriaEstatisticas
  total: number
}

interface CategoriaAcumulada {
  quantidade: number
  totalFichas: number
}

interface EstatisticasAcumuladasSegmentadas {
  chippix: CategoriaAcumulada
  manual: CategoriaAcumulada
  ranking: CategoriaAcumulada
  rakeSemanal: CategoriaAcumulada
  total: number
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

const categorias = [
  {
    key: 'chippix' as const,
    title: 'ChipPix',
    icon: Smartphone,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    subtitleColor: 'text-blue-600',
  },
  {
    key: 'manual' as const,
    title: 'Manual',
    icon: HandCoins,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    subtitleColor: 'text-amber-600',
  },
  {
    key: 'ranking' as const,
    title: 'Calculadora Ranking',
    icon: Trophy,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-900',
    subtitleColor: 'text-orange-600',
  },
  {
    key: 'rakeSemanal' as const,
    title: 'Rake Semanal',
    icon: Wallet,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900',
    subtitleColor: 'text-purple-600',
  },
]

export default function RelatoriosPage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [estatisticas, setEstatisticas] = useState<EstatisticasSegmentadas | null>(null)
  const [acumulado, setAcumulado] = useState<EstatisticasAcumuladasSegmentadas | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [mensal, total] = await Promise.all([
      getEstatisticasSegmentadas(ano, mes),
      getEstatisticasAcumuladasSegmentadas(),
    ])

    setEstatisticas(mensal)
    setAcumulado(total)
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Relatórios</h1>
          <p className="text-gray-500 mt-1">Estatísticas de transações por categoria</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={mes.toString()} onValueChange={(v) => v && setMes(parseInt(v))}>
            <SelectTrigger className="w-32">
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

          <Select value={ano.toString()} onValueChange={(v) => v && setAno(parseInt(v))}>
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Card de resumo mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Transações de {MESES.find((m) => m.value === mes)?.label} de {ano}
              </CardTitle>
              <CardDescription>
                Comparativo entre categorias de transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(estatisticas?.total || 0) === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma transação no período</p>
                  <p className="text-sm text-gray-400 mt-1">Selecione outro mês para visualizar</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {categorias.map((cat) => {
                    const data = estatisticas?.[cat.key]
                    const Icon = cat.icon
                    const percentual = estatisticas?.total
                      ? ((data?.quantidade || 0) / estatisticas.total * 100).toFixed(1)
                      : '0'

                    return (
                      <div
                        key={cat.key}
                        className={`space-y-4 p-4 ${cat.bgColor} rounded-lg border ${cat.borderColor}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-2 ${cat.iconBg} rounded-lg`}>
                            <Icon className={`h-5 w-5 ${cat.iconColor}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${cat.titleColor}`}>{cat.title}</h3>
                            <p className={`text-sm ${cat.subtitleColor}`}>
                              {data?.quantidade || 0} transações ({percentual}%)
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                              <ArrowUpCircle className="h-4 w-4" />
                              Enviadas:
                            </span>
                            <span className="font-mono font-medium">
                              {formatChips(data?.fichasEnviadas || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1 text-red-600">
                              <ArrowDownCircle className="h-4 w-4" />
                              Recebidas:
                            </span>
                            <span className="font-mono font-medium">
                              {formatChips(data?.fichasRecebidas || 0)}
                            </span>
                          </div>
                          <div className={`flex justify-between text-sm pt-2 border-t ${cat.borderColor}`}>
                            <span className={`font-medium ${cat.titleColor}`}>Total:</span>
                            <span className={`font-mono font-bold ${cat.iconColor}`}>
                              {formatChips(data?.totalFichas || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de acumulado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Acumulado Total
              </CardTitle>
              <CardDescription>
                Estatísticas desde o início das operações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Transações */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{acumulado?.total || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Total de Transações</p>
                </div>

                {categorias.map((cat) => {
                  const data = acumulado?.[cat.key]
                  const percentual = acumulado?.total
                    ? ((data?.quantidade || 0) / acumulado.total * 100).toFixed(1)
                    : '0'

                  return (
                    <div key={cat.key} className={`text-center p-4 ${cat.bgColor} rounded-lg`}>
                      <p className={`text-3xl font-bold ${cat.iconColor}`}>{data?.quantidade || 0}</p>
                      <p className={`text-sm ${cat.subtitleColor} mt-1`}>
                        {cat.title} ({percentual}%)
                      </p>
                      <p className="text-xs text-gray-500 mt-2 font-mono">
                        {formatChips(data?.totalFichas || 0)} fichas
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
