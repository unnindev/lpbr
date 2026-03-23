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
import { Progress } from '@/components/ui/progress'
import { getEstatisticasPorOrigem, getEstatisticasAcumuladas } from '@/actions/relatorios'
import { formatChips } from '@/lib/formatters'
import {
  BarChart3,
  Loader2,
  Smartphone,
  HandCoins,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
} from 'lucide-react'

interface EstatisticasOrigem {
  chippix: {
    quantidade: number
    fichasEnviadas: number
    fichasRecebidas: number
    totalFichas: number
  }
  manual: {
    quantidade: number
    fichasEnviadas: number
    fichasRecebidas: number
    totalFichas: number
  }
  percentualChippix: number
  percentualManual: number
}

interface EstatisticasAcumuladas {
  chippix: {
    quantidade: number
    totalFichas: number
  }
  manual: {
    quantidade: number
    totalFichas: number
  }
  percentualChippix: number
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

export default function RelatoriosPage() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [estatisticas, setEstatisticas] = useState<EstatisticasOrigem | null>(null)
  const [acumulado, setAcumulado] = useState<EstatisticasAcumuladas | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [mensal, total] = await Promise.all([
      getEstatisticasPorOrigem(ano, mes),
      getEstatisticasAcumuladas(),
    ])

    setEstatisticas(mensal)
    setAcumulado(total)
    setLoading(false)
  }, [ano, mes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const anos = Array.from({ length: ano - 2023 + 2 }, (_, i) => 2024 + i)

  const totalTransacoesMes = (estatisticas?.chippix.quantidade || 0) + (estatisticas?.manual.quantidade || 0)
  const totalTransacoesAcum = (acumulado?.chippix.quantidade || 0) + (acumulado?.manual.quantidade || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Relatórios</h1>
          <p className="text-gray-500 mt-1">Estatísticas de transações por origem</p>
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
                Comparativo entre transações via ChipPix e Manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalTransacoesMes === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma transação no período</p>
                  <p className="text-sm text-gray-400 mt-1">Selecione outro mês para visualizar</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Barra de progresso */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        ChipPix: {estatisticas?.percentualChippix.toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-2">
                        Manual: {estatisticas?.percentualManual.toFixed(1)}%
                        <HandCoins className="h-4 w-4 text-amber-600" />
                      </span>
                    </div>
                    <Progress value={estatisticas?.percentualChippix || 0} className="h-3" />
                  </div>

                  {/* Grid de comparação */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* ChipPix */}
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Smartphone className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-blue-900">ChipPix</h3>
                          <p className="text-sm text-blue-600">
                            {estatisticas?.chippix.quantidade} transações
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
                            {formatChips(estatisticas?.chippix.fichasEnviadas || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1 text-red-600">
                            <ArrowDownCircle className="h-4 w-4" />
                            Recebidas:
                          </span>
                          <span className="font-mono font-medium">
                            {formatChips(estatisticas?.chippix.fichasRecebidas || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                          <span className="font-medium text-blue-900">Total Fichas:</span>
                          <span className="font-mono font-bold text-blue-600">
                            {formatChips(estatisticas?.chippix.totalFichas || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Manual */}
                    <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <HandCoins className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-amber-900">Manual</h3>
                          <p className="text-sm text-amber-600">
                            {estatisticas?.manual.quantidade} transações
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
                            {formatChips(estatisticas?.manual.fichasEnviadas || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1 text-red-600">
                            <ArrowDownCircle className="h-4 w-4" />
                            Recebidas:
                          </span>
                          <span className="font-mono font-medium">
                            {formatChips(estatisticas?.manual.fichasRecebidas || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-amber-200">
                          <span className="font-medium text-amber-900">Total Fichas:</span>
                          <span className="font-mono font-bold text-amber-600">
                            {formatChips(estatisticas?.manual.totalFichas || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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
              <div className="grid grid-cols-3 gap-4">
                {/* Total Transações */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{totalTransacoesAcum}</p>
                  <p className="text-sm text-gray-500 mt-1">Total de Transações</p>
                </div>

                {/* ChipPix */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{acumulado?.chippix.quantidade || 0}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Via ChipPix ({acumulado?.percentualChippix.toFixed(1)}%)
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    {formatChips(acumulado?.chippix.totalFichas || 0)} fichas
                  </p>
                </div>

                {/* Manual */}
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{acumulado?.manual.quantidade || 0}</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Manual ({(100 - (acumulado?.percentualChippix || 0)).toFixed(1)}%)
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    {formatChips(acumulado?.manual.totalFichas || 0)} fichas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
