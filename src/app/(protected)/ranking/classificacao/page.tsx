'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Trophy, Edit, Medal, Printer } from 'lucide-react'
import {
  listarEtapas,
  listarMesesReferencia,
  criarEtapa,
  excluirEtapa,
  listarVersoesPontosResumo,
  getDefaultColetaPercentual,
  getRankingGeral,
  getRankingMensalDetalhado,
  type EtapaResumo,
  type RankingGeralLinha,
  type RankingMensalDetalhado,
} from '@/actions/ranking-classificacao'

export default function ClassificacaoPage() {
  const router = useRouter()
  const [etapas, setEtapas] = useState<EtapaResumo[]>([])
  const [meses, setMeses] = useState<string[]>([])
  const [filtroMes, setFiltroMes] = useState<string>(() => format(new Date(), 'yyyy-MM-01'))
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const mes = filtroMes === 'todos' ? undefined : filtroMes
    const [lista, mesesLista] = await Promise.all([listarEtapas(mes), listarMesesReferencia()])
    setEtapas(lista)
    setMeses(mesesLista)
    setLoading(false)
  }, [filtroMes])

  useEffect(() => { loadData() }, [loadData])

  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir a etapa "${nome}"? As coletas geradas por ela também serão removidas.`)) return
    const r = await excluirEtapa(id)
    if (r.success) {
      toast.success('Etapa excluída')
      loadData()
    } else {
      toast.error(r.error || 'Erro')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classificação</h1>
          <p className="text-gray-500">Etapas, posições e pontuação do ranking</p>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-500">Mês de referência:</Label>
          <Select value={filtroMes} onValueChange={(v) => v && setFiltroMes(v)}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {filtroMes === 'todos' ? 'Todos' : format(new Date(filtroMes + 'T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Array.from(new Set([filtroMes, ...meses]))
                .filter(m => m !== 'todos')
                .sort((a, b) => b.localeCompare(a))
                .map((m) => (
                  <SelectItem key={m} value={m}>
                    {format(new Date(m + 'T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <NovaEtapaDialog onCreated={(id) => router.push(`/ranking/classificacao/${id}`)} />
        </div>
      </div>

      <Tabs defaultValue="etapas">
        <TabsList>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          <TabsTrigger value="geral">Ranking Geral</TabsTrigger>
          <TabsTrigger value="por_etapas">Classificação por Etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="etapas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Etapas</CardTitle>
              <CardDescription>
                {filtroMes === 'todos' ? 'Todas as etapas' : 'Etapas do mês selecionado'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : etapas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma etapa encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Mês ref.</TableHead>
                      <TableHead>Versão pontos</TableHead>
                      <TableHead className="text-right">% Coleta</TableHead>
                      <TableHead className="text-right">Classificações</TableHead>
                      <TableHead className="text-right">Coletas</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etapas.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.nome}</TableCell>
                        <TableCell>{format(new Date(e.data_realizada + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(new Date(e.mes_referencia + 'T12:00:00'), "MMM/yy", { locale: ptBR })}</TableCell>
                        <TableCell>
                          {e.pontos_versao_label ? (
                            <Badge variant="outline">{e.pontos_versao_label}</Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{e.percentual_coleta}%</TableCell>
                        <TableCell className="text-right font-mono">{e.total_classificacoes}</TableCell>
                        <TableCell className="text-right font-mono">{e.total_coletas}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/ranking/classificacao/${e.id}?print=1`)}
                              title="Imprimir / PDF da etapa"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/ranking/classificacao/${e.id}`)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExcluir(e.id, e.nome)}
                              className="text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geral" className="mt-4">
          <RankingResumoView mes={filtroMes === 'todos' ? '' : filtroMes} />
        </TabsContent>

        <TabsContent value="por_etapas" className="mt-4">
          <RankingPorEtapasView mes={filtroMes === 'todos' ? '' : filtroMes} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MesEmpty() {
  return (
    <Card>
      <CardContent className="pt-6 text-center text-gray-500">
        <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Selecione um mês de referência acima.</p>
      </CardContent>
    </Card>
  )
}

function RankingResumoView({ mes }: { mes: string }) {
  const [linhas, setLinhas] = useState<RankingGeralLinha[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mes) {
      setLinhas([])
      return
    }
    setLoading(true)
    getRankingGeral(mes).then(data => {
      setLinhas(data)
      setLoading(false)
    })
  }, [mes])

  if (!mes) return <MesEmpty />

  const handlePrint = () => window.print()
  const mesLabel = format(new Date(mes + 'T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })
  const mesShort = format(new Date(mes + 'T12:00:00'), "MMM/yyyy", { locale: ptBR }).toUpperCase()

  return (
    <>
      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ranking Geral — {mesLabel}</CardTitle>
              <CardDescription>
                Resumo por jogador: pontos, etapas disputadas, premiações e melhor posição.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={loading || linhas.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : linhas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum jogador classificado neste mês.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Etapas</TableHead>
                  <TableHead className="text-right">Premiações</TableHead>
                  <TableHead className="text-right">Melhor pos.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, idx) => (
                  <TableRow key={l.player_id}>
                    <TableCell className="font-bold">
                      {l.total_pontos > 0 ? idx + 1 : '—'}
                    </TableCell>
                    <TableCell className="font-medium">{l.player_nick}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {l.total_pontos > 0 ? l.total_pontos.toFixed(2) : '0'}
                    </TableCell>
                    <TableCell className="text-right font-mono">{l.etapas_disputadas}</TableCell>
                    <TableCell className="text-right font-mono">
                      {l.premiacoes > 0 ? l.premiacoes : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">{l.melhor_posicao ?? '—'}º</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {linhas.length > 0 && (
        <div className="print-area hidden print:block">
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-ranking.jpeg" alt="WOLF Logo" className="h-20 w-auto" />
            <div className="text-center">
              <h1 className="text-2xl font-bold">WOLF LIVE POKER — RANKING GERAL</h1>
              <p className="text-lg font-semibold mt-1">{mesShort}</p>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1 text-left w-16">#</th>
                <th className="border border-gray-400 px-2 py-1 text-left">Jogador</th>
                <th className="border border-gray-400 px-2 py-1 text-right w-24">Pontos</th>
                <th className="border border-gray-400 px-2 py-1 text-right w-24">Etapas</th>
                <th className="border border-gray-400 px-2 py-1 text-right w-28">Premiações</th>
                <th className="border border-gray-400 px-2 py-1 text-right w-28">Melhor pos.</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, idx) => (
                <tr key={l.player_id}>
                  <td className="border border-gray-400 px-2 py-1 font-bold">
                    {l.total_pontos > 0 ? `${idx + 1}º` : '—'}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 font-medium">{l.player_nick}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-mono font-bold">
                    {l.total_pontos > 0 ? l.total_pontos.toFixed(0) : '0'}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-mono">
                    {l.etapas_disputadas}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-mono">
                    {l.premiacoes > 0 ? l.premiacoes : '—'}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-mono">
                    {l.melhor_posicao ?? '—'}º
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function RankingPorEtapasView({ mes }: { mes: string }) {
  const [detalhado, setDetalhado] = useState<RankingMensalDetalhado | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mes) {
      setDetalhado(null)
      return
    }
    setLoading(true)
    getRankingMensalDetalhado(mes).then(det => {
      setDetalhado(det)
      setLoading(false)
    })
  }, [mes])

  if (!mes) return <MesEmpty />

  const handlePrint = () => window.print()
  const mesLabel = format(new Date(mes + 'T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })
  const mesShort = format(new Date(mes + 'T12:00:00'), "MMM/yyyy", { locale: ptBR }).toUpperCase()

  const renderMatrix = (klass: string) => detalhado && detalhado.etapas.length > 0 && (
    <table className={`w-full text-xs border-collapse ${klass}`}>
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-400 px-2 py-1 text-left">CLASSIF.</th>
          <th className="border border-gray-400 px-2 py-1 text-left">NOME</th>
          {detalhado.etapas.map(e => (
            <th key={e.id} className="border border-gray-400 px-1 py-1 text-center">
              <div className="text-[10px] font-semibold">ETAPA {e.numero}</div>
              <div className="text-[10px] font-normal">
                {format(new Date(e.data_realizada + 'T12:00:00'), 'dd/MM')}
              </div>
            </th>
          ))}
          <th className="border border-gray-400 px-2 py-1 text-center">Total de Pontos</th>
        </tr>
      </thead>
      <tbody>
        {detalhado.jogadores.map((j, idx) => (
          <tr key={j.player_id}>
            <td className="border border-gray-400 px-2 py-1 text-center font-bold">{idx + 1}º</td>
            <td className="border border-gray-400 px-2 py-1 font-medium">
              {j.player_nick}{j.player_name && j.player_name !== j.player_nick ? ` (${j.player_name})` : ''}
            </td>
            {detalhado.etapas.map(e => {
              const p = j.pontosPorEtapa[e.id]
              return (
                <td key={e.id} className="border border-gray-400 px-1 py-1 text-center font-mono">
                  {p && p > 0 ? p : ''}
                </td>
              )
            })}
            <td className="border border-gray-400 px-2 py-1 text-center font-mono font-bold bg-gray-50">
              {j.total_pontos.toFixed(0)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2} className="border border-gray-400 px-2 py-1 font-bold text-right bg-gray-100">
            Coleta da Etapa
          </td>
          {detalhado.etapas.map(e => (
            <td key={e.id} className="border border-gray-400 px-1 py-1 text-center font-mono bg-gray-100">
              {e.coleta_chips > 0 ? e.coleta_chips.toFixed(2) : '—'}
            </td>
          ))}
          <td className="border border-gray-400 bg-gray-100"></td>
        </tr>
        <tr>
          <td colSpan={2} className="border border-gray-400 px-2 py-1 font-bold text-right bg-gray-200">
            Saldo Acumulado
          </td>
          {detalhado.etapas.map(e => (
            <td key={e.id} className="border border-gray-400 px-1 py-1 text-center font-mono font-bold bg-gray-200">
              {e.saldo_acumulado.toFixed(2)}
            </td>
          ))}
          <td className="border border-gray-400 bg-gray-200"></td>
        </tr>
      </tfoot>
    </table>
  )

  return (
    <>
      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classificação por Etapas — {mesLabel}</CardTitle>
              <CardDescription>
                Pontos por jogador em cada etapa, total e saldo do ranking acumulado.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={loading || !detalhado || detalhado.etapas.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : !detalhado || detalhado.etapas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma etapa registrada neste mês.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {renderMatrix('')}
            </div>
          )}
        </CardContent>
      </Card>

      {detalhado && detalhado.etapas.length > 0 && (
        <div className="print-area hidden print:block">
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-ranking.jpeg" alt="WOLF Logo" className="h-20 w-auto" />
            <div className="text-center">
              <h1 className="text-2xl font-bold">WOLF LIVE POKER — RANKING</h1>
              <p className="text-lg font-semibold mt-1">{mesShort}</p>
            </div>
          </div>
          {renderMatrix('')}
        </div>
      )}
    </>
  )
}

function NovaEtapaDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const hoje = new Date()
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [dataRealizada, setDataRealizada] = useState(format(hoje, 'yyyy-MM-dd'))
  const [mesReferencia, setMesReferencia] = useState(format(hoje, 'yyyy-MM-01'))
  const [versaoId, setVersaoId] = useState<string>('')
  const [percentual, setPercentual] = useState('8')
  const [versoes, setVersoes] = useState<Array<{ id: string; label: string; ativa: boolean }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([listarVersoesPontosResumo(), getDefaultColetaPercentual()]).then(([v, pct]) => {
      setVersoes(v)
      const ativa = v.find(x => x.ativa)
      if (ativa) setVersaoId(ativa.id)
      setPercentual(pct.toString())
    })
  }, [open])

  const handleSubmit = async () => {
    if (!nome.trim()) return toast.error('Informe o nome')
    if (!dataRealizada) return toast.error('Informe a data')
    if (!mesReferencia) return toast.error('Informe o mês de referência')

    setSaving(true)
    const r = await criarEtapa({
      nome: nome.trim(),
      data_realizada: dataRealizada,
      mes_referencia: mesReferencia,
      pontos_versao_id: versaoId || null,
      percentual_coleta: parseFloat(percentual) || 0,
    })
    setSaving(false)

    if (r.success && r.id) {
      toast.success('Etapa criada')
      setOpen(false)
      setNome('')
      onCreated(r.id)
    } else {
      toast.error(r.error || 'Erro ao criar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Nova Etapa
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova etapa</DialogTitle>
          <DialogDescription>Informe os dados da etapa antes de lançar a classificação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da etapa</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Etapa 1 - Maio" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data realizada</Label>
              <Input type="date" value={dataRealizada} onChange={(e) => setDataRealizada(e.target.value)} />
            </div>
            <div>
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={mesReferencia.slice(0, 7)}
                onChange={(e) => setMesReferencia(e.target.value + '-01')}
              />
            </div>
          </div>
          <div>
            <Label>Versão da tabela de pontos</Label>
            <Select value={versaoId} onValueChange={(v) => v && setVersaoId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(() => {
                    const v = versoes.find(x => x.id === versaoId)
                    return v ? `${v.label}${v.ativa ? ' (ativa)' : ''}` : null
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {versoes.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}{v.ativa ? ' (ativa)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {versoes.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                Nenhuma versão de pontos cadastrada. Cadastre em Desenvolvedor → Config. Ranking.
              </p>
            )}
          </div>
          <div>
            <Label>Percentual de coleta</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                className="w-24"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
