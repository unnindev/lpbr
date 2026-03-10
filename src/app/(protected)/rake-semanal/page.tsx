'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listarAgentes, salvarRakeSemanal } from '@/actions/agentes'
import { formatChips } from '@/lib/formatters'
import { getWeekNumber } from '@/lib/competencia'
import { ChevronLeft, ChevronRight, Loader2, Save, Wallet } from 'lucide-react'
import { toast } from 'sonner'

interface Agent {
  id: string
  platform: 'PPOKER' | 'SUPREMA'
  pct_rakeback: number
  pct_lpbr: number
  pct_suprema: number | null
  player: {
    id: string
    nick: string
    name: string
  }
}

export default function RakeSemanalPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [agentsPPoker, setAgentsPPoker] = useState<Agent[]>([])
  const [agentsSuprema, setAgentsSuprema] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'PPOKER' | 'SUPREMA'>('PPOKER')

  // PPPoker: valor direto a pagar
  const [valorPagar, setValorPagar] = useState<Record<string, string>>({})

  // Suprema: valor do rake (para calcular as porcentagens)
  const [rakeValues, setRakeValues] = useState<Record<string, string>>({})

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekNumber = getWeekNumber(currentWeek)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [ppoker, suprema] = await Promise.all([
      listarAgentes('PPOKER'),
      listarAgentes('SUPREMA'),
    ])

    setAgentsPPoker(ppoker)
    setAgentsSuprema(suprema)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
    setValorPagar({})
    setRakeValues({})
  }

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
    setValorPagar({})
    setRakeValues({})
  }

  const updateValorPagar = (agentId: string, value: string) => {
    setValorPagar((prev) => ({ ...prev, [agentId]: value }))
  }

  const updateRakeValue = (agentId: string, value: string) => {
    setRakeValues((prev) => ({ ...prev, [agentId]: value }))
  }

  // Calcular rakeback para Suprema
  const calcularRakeback = (agent: Agent, rake: number) => {
    return rake * (agent.pct_rakeback / 100)
  }

  const handleSalvarTudo = async () => {
    const entries: { agentId: string; valorPagar: number }[] = []

    if (tab === 'PPOKER') {
      // PPPoker: valor direto
      for (const agent of agentsPPoker) {
        const valor = parseFloat(valorPagar[agent.id] || '0')
        if (valor > 0) {
          entries.push({ agentId: agent.id, valorPagar: valor })
        }
      }
    } else {
      // Suprema: calcular rakeback a partir do rake
      for (const agent of agentsSuprema) {
        const rake = parseFloat(rakeValues[agent.id] || '0')
        if (rake > 0) {
          const rakeback = calcularRakeback(agent, rake)
          entries.push({ agentId: agent.id, valorPagar: rakeback })
        }
      }
    }

    if (entries.length === 0) {
      toast.error('Preencha pelo menos um valor')
      return
    }

    setSaving(true)

    const result = await salvarRakeSemanal({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      platform: tab,
      entries,
    })

    if (result.success) {
      toast.success('Rake semanal salvo com sucesso!')
      setValorPagar({})
      setRakeValues({})
    } else {
      toast.error(result.error || 'Erro ao salvar')
    }

    setSaving(false)
  }

  // Calcular totais
  const totalPagarPPoker = agentsPPoker.reduce(
    (acc, a) => acc + (parseFloat(valorPagar[a.id] || '0') || 0),
    0
  )

  const totalPagarSuprema = agentsSuprema.reduce((acc, agent) => {
    const rake = parseFloat(rakeValues[agent.id] || '0') || 0
    return acc + calcularRakeback(agent, rake)
  }, 0)

  const totalPagar = tab === 'PPOKER' ? totalPagarPPoker : totalPagarSuprema

  return (
    <div className="space-y-6">
      {/* Header com navegação de semana */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rake Semanal</h1>
          <p className="text-gray-500">Pagamento de rakeback aos agentes</p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center min-w-[200px]">
            <p className="font-medium">
              {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
            </p>
            <p className="text-sm text-gray-500">
              Semana {weekNumber}/{currentWeek.getFullYear()}
            </p>
          </div>

          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs PPPoker / Suprema */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'PPOKER' | 'SUPREMA')}>
        <TabsList>
          <TabsTrigger value="PPOKER">PPPoker</TabsTrigger>
          <TabsTrigger value="SUPREMA">Suprema</TabsTrigger>
        </TabsList>

        <TabsContent value="PPOKER" className="mt-4">
          <RakeTablePPoker
            agents={agentsPPoker}
            valorPagar={valorPagar}
            updateValorPagar={updateValorPagar}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="SUPREMA" className="mt-4">
          <RakeTableSuprema
            agents={agentsSuprema}
            rakeValues={rakeValues}
            updateRakeValue={updateRakeValue}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Total e botão salvar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total a Pagar</p>
              <p className="text-xl font-bold text-green-600">{formatChips(totalPagar)}</p>
            </div>

            <Button onClick={handleSalvarTudo} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Tudo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Tabela PPPoker - valor direto
function RakeTablePPoker({
  agents,
  valorPagar,
  updateValorPagar,
  loading,
}: {
  agents: Agent[]
  valorPagar: Record<string, string>
  updateValorPagar: (id: string, value: string) => void
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-32 text-gray-500">
          <Wallet className="h-8 w-8 mb-2 opacity-50" />
          <p>Nenhum agente cadastrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agentes PPPoker</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agente</TableHead>
              <TableHead className="text-right">Valor a Pagar (fichas)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{agent.player.nick}</span>
                    <span className="text-gray-500 text-sm ml-2">{agent.player.name}</span>
                  </div>
                </TableCell>
                <TableCell className="w-48">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorPagar[agent.id] || ''}
                    onChange={(e) => updateValorPagar(agent.id, e.target.value)}
                    placeholder="0,00"
                    className="text-right"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Tabela Suprema - com cálculo de porcentagens
function RakeTableSuprema({
  agents,
  rakeValues,
  updateRakeValue,
  loading,
}: {
  agents: Agent[]
  rakeValues: Record<string, string>
  updateRakeValue: (id: string, value: string) => void
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-32 text-gray-500">
          <Wallet className="h-8 w-8 mb-2 opacity-50" />
          <p>Nenhum agente cadastrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agentes Suprema</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agente</TableHead>
              <TableHead className="text-center">%</TableHead>
              <TableHead className="text-right">Rake Total</TableHead>
              <TableHead className="text-right">Rakeback</TableHead>
              <TableHead className="text-right">LPBR</TableHead>
              <TableHead className="text-right">Suprema</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => {
              const rake = parseFloat(rakeValues[agent.id] || '0') || 0
              const rakeback = rake * (agent.pct_rakeback / 100)
              const lpbr = rake * (agent.pct_lpbr / 100)
              const suprema = rake * ((agent.pct_suprema || 0) / 100)

              return (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{agent.player.nick}</span>
                      <span className="text-gray-500 text-sm ml-2">{agent.player.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-gray-500">
                    {agent.pct_rakeback}/{agent.pct_lpbr}/{agent.pct_suprema || 0}
                  </TableCell>
                  <TableCell className="w-32">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rakeValues[agent.id] || ''}
                      onChange={(e) => updateRakeValue(agent.id, e.target.value)}
                      placeholder="0,00"
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600 font-medium">
                    {rake > 0 ? formatChips(rakeback) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-blue-600">
                    {rake > 0 ? formatChips(lpbr) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-purple-600">
                    {rake > 0 ? formatChips(suprema) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
