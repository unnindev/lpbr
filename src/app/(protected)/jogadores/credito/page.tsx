'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getJogadoresComCredito, getTotalCredito } from '@/actions/jogadores'
import { formatChips } from '@/lib/formatters'
import { CreditCard, Loader2, AlertTriangle } from 'lucide-react'

interface JogadorComCredito {
  player: {
    id: string
    nick: string
    name: string
  }
  divida: number
}

export default function CreditoPage() {
  const [jogadores, setJogadores] = useState<JogadorComCredito[]>([])
  const [totalCredito, setTotalCredito] = useState(0)
  const [loading, setLoading] = useState(true)

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
                  <TableRow key={item.player.id}>
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
    </div>
  )
}
