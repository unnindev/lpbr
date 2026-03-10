'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { listarAgentes, salvarRakeSemanal } from '@/actions/agentes'
import { formatChips, formatCurrency } from '@/lib/formatters'
import { getWeekNumber } from '@/lib/competencia'
import { ChevronLeft, ChevronRight, Loader2, Save, Wallet, CalendarIcon, Coins, Banknote, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type PaymentModality = 'FICHAS' | 'DINHEIRO' | 'DIVIDA'

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
    club_id: string
  }
}

interface AgentEntry {
  valor: string
  modalidade: PaymentModality
}

export default function RakeSemanalPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [registrationDate, setRegistrationDate] = useState<Date>(() => {
    // Por padrão, dia seguinte ao fim da semana
    return addDays(endOfWeek(new Date(), { weekStartsOn: 1 }), 1)
  })
  const [agentsPPoker, setAgentsPPoker] = useState<Agent[]>([])
  const [agentsSuprema, setAgentsSuprema] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'PPOKER' | 'SUPREMA'>('PPOKER')

  // Entradas por agente: valor + modalidade
  const [entriesPPoker, setEntriesPPoker] = useState<Record<string, AgentEntry>>({})
  const [entriesSuprema, setEntriesSuprema] = useState<Record<string, AgentEntry>>({})

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

  // Atualizar data de registro quando mudar a semana
  useEffect(() => {
    setRegistrationDate(addDays(weekEnd, 1))
  }, [weekEnd])

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
    setEntriesPPoker({})
    setEntriesSuprema({})
    setRakeValues({})
  }

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
    setEntriesPPoker({})
    setEntriesSuprema({})
    setRakeValues({})
  }

  const updateEntryPPoker = (agentId: string, field: 'valor' | 'modalidade', value: string) => {
    setEntriesPPoker((prev) => ({
      ...prev,
      [agentId]: {
        valor: prev[agentId]?.valor || '',
        modalidade: prev[agentId]?.modalidade || 'FICHAS',
        [field]: value,
      },
    }))
  }

  const updateEntrySuprema = (agentId: string, field: 'valor' | 'modalidade', value: string) => {
    setEntriesSuprema((prev) => ({
      ...prev,
      [agentId]: {
        valor: prev[agentId]?.valor || '',
        modalidade: prev[agentId]?.modalidade || 'FICHAS',
        [field]: value,
      },
    }))
  }

  const updateRakeValue = (agentId: string, value: string) => {
    setRakeValues((prev) => ({ ...prev, [agentId]: value }))
  }

  // Calcular rakeback para Suprema
  const calcularRakeback = (agent: Agent, rake: number) => {
    return rake * (agent.pct_rakeback / 100)
  }

  const handleSalvarTudo = async () => {
    const entries: { agentId: string; valor: number; modalidade: PaymentModality }[] = []

    if (tab === 'PPOKER') {
      // PPPoker: valor direto com modalidade
      for (const agent of agentsPPoker) {
        const entry = entriesPPoker[agent.id]
        const valor = parseFloat(entry?.valor || '0')
        if (valor > 0) {
          entries.push({
            agentId: agent.id,
            valor,
            modalidade: entry?.modalidade || 'FICHAS',
          })
        }
      }
    } else {
      // Suprema: calcular rakeback a partir do rake
      for (const agent of agentsSuprema) {
        const rake = parseFloat(rakeValues[agent.id] || '0')
        const entry = entriesSuprema[agent.id]
        if (rake > 0) {
          const rakeback = calcularRakeback(agent, rake)
          entries.push({
            agentId: agent.id,
            valor: rakeback,
            modalidade: entry?.modalidade || 'FICHAS',
          })
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
      registrationDate: format(registrationDate, 'yyyy-MM-dd'),
      platform: tab,
      entries,
    })

    if (result.success) {
      toast.success('Rake semanal salvo com sucesso!')
      setEntriesPPoker({})
      setEntriesSuprema({})
      setRakeValues({})
    } else {
      toast.error(result.error || 'Erro ao salvar')
    }

    setSaving(false)
  }

  // Calcular totais por modalidade
  const calcularTotais = () => {
    let totalFichas = 0
    let totalDinheiro = 0
    let totalDivida = 0

    if (tab === 'PPOKER') {
      for (const agent of agentsPPoker) {
        const entry = entriesPPoker[agent.id]
        const valor = parseFloat(entry?.valor || '0') || 0
        if (valor > 0) {
          switch (entry?.modalidade || 'FICHAS') {
            case 'FICHAS':
              totalFichas += valor
              break
            case 'DINHEIRO':
              totalDinheiro += valor
              break
            case 'DIVIDA':
              totalDivida += valor
              break
          }
        }
      }
    } else {
      for (const agent of agentsSuprema) {
        const rake = parseFloat(rakeValues[agent.id] || '0') || 0
        const entry = entriesSuprema[agent.id]
        if (rake > 0) {
          const rakeback = calcularRakeback(agent, rake)
          switch (entry?.modalidade || 'FICHAS') {
            case 'FICHAS':
              totalFichas += rakeback
              break
            case 'DINHEIRO':
              totalDinheiro += rakeback
              break
            case 'DIVIDA':
              totalDivida += rakeback
              break
          }
        }
      }
    }

    return { totalFichas, totalDinheiro, totalDivida, total: totalFichas + totalDinheiro + totalDivida }
  }

  const totais = calcularTotais()

  return (
    <div className="space-y-6">
      {/* Header com navegação de semana */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rake Semanal</h1>
          <p className="text-gray-500">Pagamento de rakeback aos agentes</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Navegação da semana */}
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

          {/* Data de registro */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-500 whitespace-nowrap">Registro em:</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !registrationDate && 'text-muted-foreground'
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(registrationDate, 'dd/MM/yyyy')}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={registrationDate}
                  onSelect={(date) => date && setRegistrationDate(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
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
            entries={entriesPPoker}
            updateEntry={updateEntryPPoker}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="SUPREMA" className="mt-4">
          <RakeTableSuprema
            agents={agentsSuprema}
            entries={entriesSuprema}
            rakeValues={rakeValues}
            updateEntry={updateEntrySuprema}
            updateRakeValue={updateRakeValue}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Resumo e botão salvar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-8">
              {totais.totalFichas > 0 && (
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Fichas</p>
                    <p className="font-bold text-green-600">{formatChips(totais.totalFichas)}</p>
                  </div>
                </div>
              )}
              {totais.totalDinheiro > 0 && (
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Dinheiro</p>
                    <p className="font-bold text-blue-600">{formatCurrency(totais.totalDinheiro)}</p>
                  </div>
                </div>
              )}
              {totais.totalDivida > 0 && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-500">Abate Dívida</p>
                    <p className="font-bold text-purple-600">{formatCurrency(totais.totalDivida)}</p>
                  </div>
                </div>
              )}
              {totais.total === 0 && (
                <p className="text-gray-500">Nenhum valor preenchido</p>
              )}
            </div>

            <Button onClick={handleSalvarTudo} disabled={saving || totais.total === 0} size="lg">
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

// Componente de seleção de modalidade
function ModalitySelect({
  value,
  onChange,
}: {
  value: PaymentModality
  onChange: (value: PaymentModality) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PaymentModality)}>
      <SelectTrigger className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="FICHAS">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-green-600" />
            <span>Fichas</span>
          </div>
        </SelectItem>
        <SelectItem value="DINHEIRO">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-blue-600" />
            <span>Dinheiro</span>
          </div>
        </SelectItem>
        <SelectItem value="DIVIDA">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-600" />
            <span>Dívida</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

// Tabela PPPoker - valor direto com modalidade
function RakeTablePPoker({
  agents,
  entries,
  updateEntry,
  loading,
}: {
  agents: Agent[]
  entries: Record<string, AgentEntry>
  updateEntry: (id: string, field: 'valor' | 'modalidade', value: string) => void
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
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Modalidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => {
              const entry = entries[agent.id] || { valor: '', modalidade: 'FICHAS' as PaymentModality }
              return (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{agent.player.nick}</span>
                      <span className="text-gray-500 text-sm ml-2">{agent.player.name} ({agent.player.club_id})</span>
                    </div>
                  </TableCell>
                  <TableCell className="w-40">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.valor}
                      onChange={(e) => updateEntry(agent.id, 'valor', e.target.value)}
                      placeholder="0,00"
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell className="w-40">
                    <ModalitySelect
                      value={entry.modalidade}
                      onChange={(v) => updateEntry(agent.id, 'modalidade', v)}
                    />
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

// Tabela Suprema - com cálculo de porcentagens e modalidade
function RakeTableSuprema({
  agents,
  entries,
  rakeValues,
  updateEntry,
  updateRakeValue,
  loading,
}: {
  agents: Agent[]
  entries: Record<string, AgentEntry>
  rakeValues: Record<string, string>
  updateEntry: (id: string, field: 'valor' | 'modalidade', value: string) => void
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
              <TableHead>Modalidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => {
              const rake = parseFloat(rakeValues[agent.id] || '0') || 0
              const rakeback = rake * (agent.pct_rakeback / 100)
              const entry = entries[agent.id] || { valor: '', modalidade: 'FICHAS' as PaymentModality }

              return (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{agent.player.nick}</span>
                      <span className="text-gray-500 text-sm ml-2">{agent.player.name} ({agent.player.club_id})</span>
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
                  <TableCell className="text-right font-mono text-green-600 font-medium w-28">
                    {rake > 0 ? formatChips(rakeback) : '—'}
                  </TableCell>
                  <TableCell className="w-40">
                    <ModalitySelect
                      value={entry.modalidade}
                      onChange={(v) => updateEntry(agent.id, 'modalidade', v)}
                    />
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
