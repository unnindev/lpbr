'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Checkbox } from '@/components/ui/checkbox'
import { PlayerSelector } from '@/components/shared/player-selector'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Save, ArrowLeft, AlertTriangle, Printer } from 'lucide-react'
import {
  getEtapa,
  getPontosVersao,
  editarEtapa,
  salvarClassificacao,
  listarVersoesPontosResumo,
  type EtapaDetalhe,
} from '@/actions/ranking-classificacao'
import { formatChips } from '@/lib/formatters'

interface Linha {
  id: string  // local id
  classificacaoId?: string
  player_id: string
  player_nick: string
  posicao: number
  foi_premiado: boolean
  premio_chips: string
}

export default function EtapaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: etapaId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [etapa, setEtapa] = useState<EtapaDetalhe | null>(null)
  const [pontosMapa, setPontosMapa] = useState<Record<number, number>>({})
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [versoes, setVersoes] = useState<Array<{ id: string; label: string; ativa: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edição dos metadados da etapa
  const [editNome, setEditNome] = useState('')
  const [editData, setEditData] = useState('')
  const [editMes, setEditMes] = useState('')
  const [editVersao, setEditVersao] = useState('')
  const [editPercentual, setEditPercentual] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [det, vs] = await Promise.all([getEtapa(etapaId), listarVersoesPontosResumo()])
    setVersoes(vs)
    if (!det) {
      toast.error('Etapa não encontrada')
      router.push('/ranking/classificacao')
      return
    }
    setEtapa(det)
    setEditNome(det.nome)
    setEditData(det.data_realizada)
    setEditMes(det.mes_referencia)
    setEditVersao(det.pontos_versao_id || '')
    setEditPercentual(det.percentual_coleta.toString())

    if (det.pontos_versao_id) {
      const mapa = await getPontosVersao(det.pontos_versao_id)
      setPontosMapa(mapa)
    } else {
      setPontosMapa({})
    }

    setLinhas(det.classificacoes.map((c) => ({
      id: crypto.randomUUID(),
      classificacaoId: c.id,
      player_id: c.player_id,
      player_nick: c.player_nick,
      posicao: c.posicao,
      foi_premiado: c.foi_premiado,
      premio_chips: c.premio_chips ? c.premio_chips.toString() : '',
    })))
    setLoading(false)
  }, [etapaId, router])

  useEffect(() => { loadData() }, [loadData])

  // Auto-impressão quando vem com ?print=1
  useEffect(() => {
    if (loading || !etapa || linhas.length === 0) return
    if (searchParams.get('print') === '1') {
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [loading, etapa, linhas.length, searchParams])

  const addLinha = () => {
    const proxPos = linhas.length === 0 ? 1 : Math.max(...linhas.map(l => l.posicao)) + 1
    setLinhas([
      ...linhas,
      { id: crypto.randomUUID(), player_id: '', player_nick: '', posicao: proxPos, foi_premiado: false, premio_chips: '' },
    ])
  }

  const removeLinha = (id: string) => {
    setLinhas(linhas.filter(l => l.id !== id))
  }

  const updateLinha = (id: string, patch: Partial<Linha>) => {
    setLinhas(linhas.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const handleSalvarMeta = async () => {
    setSavingMeta(true)
    const r = await editarEtapa(etapaId, {
      nome: editNome.trim(),
      data_realizada: editData,
      mes_referencia: editMes,
      pontos_versao_id: editVersao || null,
      percentual_coleta: parseFloat(editPercentual) || 0,
    })
    setSavingMeta(false)
    if (r.success) {
      toast.success('Etapa atualizada')
      loadData()
    } else {
      toast.error(r.error || 'Erro')
    }
  }

  const handleSalvarClassif = async () => {
    // Validação
    const playersUnicos = new Set<string>()
    const posicoesUnicas = new Set<number>()
    for (const l of linhas) {
      if (!l.player_id) return toast.error('Selecione o jogador em todas as linhas')
      if (playersUnicos.has(l.player_id)) return toast.error('Há jogador duplicado')
      if (posicoesUnicas.has(l.posicao)) return toast.error('Há posições duplicadas')
      if (l.foi_premiado && !parseFloat(l.premio_chips)) return toast.error('Informe o prêmio dos premiados')
      playersUnicos.add(l.player_id)
      posicoesUnicas.add(l.posicao)
    }

    setSaving(true)
    const r = await salvarClassificacao(etapaId, linhas.map(l => ({
      player_id: l.player_id,
      posicao: l.posicao,
      foi_premiado: l.foi_premiado,
      premio_chips: l.foi_premiado ? (parseFloat(l.premio_chips) || 0) : null,
    })))
    setSaving(false)

    if (r.success) {
      toast.success('Classificação salva')
      loadData()
    } else {
      toast.error(r.error || 'Erro ao salvar')
    }
  }

  if (loading || !etapa) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  }

  const semVersao = !etapa.pontos_versao_id
  const totalColetaChips = linhas.reduce((acc, l) => {
    if (!l.foi_premiado) return acc
    const premio = parseFloat(l.premio_chips) || 0
    return acc + premio * (etapa.percentual_coleta / 100)
  }, 0)

  const handlePrint = () => {
    window.print()
  }

  // Linhas ordenadas por posição pra impressão
  const linhasOrdenadas = [...linhas].sort((a, b) => a.posicao - b.posicao)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
        <Button variant="outline" size="icon" onClick={() => router.push('/ranking/classificacao')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{etapa.nome}</h1>
          <p className="text-gray-500">
            {format(new Date(etapa.data_realizada + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {' · '}
            Mês ref: {format(new Date(etapa.mes_referencia + 'T12:00:00'), "MMM/yy", { locale: ptBR })}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint} disabled={linhas.length === 0}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir / PDF
        </Button>
      </div>

      {/* Layout para impressão / PDF — apenas a etapa */}
      <div className="print-area">
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-ranking.jpeg" alt="WOLF Logo" className="h-20 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">WOLF LIVE POKER</h1>
            <p className="text-lg font-semibold mt-1">{etapa.nome}</p>
            <p className="text-sm">
              {format(new Date(etapa.data_realizada + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left w-20">Posição</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Jogador</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-24">Pontos</th>
              <th className="border border-gray-400 px-2 py-1 text-right w-32">Prêmio</th>
            </tr>
          </thead>
          <tbody>
            {linhasOrdenadas.map((l) => {
              const pontos = pontosMapa[l.posicao] || 0
              const premio = parseFloat(l.premio_chips) || 0
              return (
                <tr key={l.id}>
                  <td className="border border-gray-400 px-2 py-1 font-bold">{l.posicao}º</td>
                  <td className="border border-gray-400 px-2 py-1">{l.player_nick}</td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-mono">
                    {pontos > 0 ? pontos : ''}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right font-mono">
                    {l.foi_premiado && premio > 0 ? formatChips(premio) : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Metadados editáveis */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da etapa</CardTitle>
          <CardDescription>Edite metadados da etapa. Mudar a versão de pontos não altera classificações já salvas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div>
              <Label>Data realizada</Label>
              <Input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
            </div>
            <div>
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={editMes.slice(0, 7)}
                onChange={(e) => setEditMes(e.target.value + '-01')}
              />
            </div>
            <div>
              <Label>Versão de pontos</Label>
              <Select value={editVersao} onValueChange={(v) => v && setEditVersao(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione">
                    {(() => {
                      const v = versoes.find(x => x.id === editVersao)
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
            </div>
            <div>
              <Label>Percentual de coleta</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={editPercentual}
                  onChange={(e) => setEditPercentual(e.target.value)}
                  className="w-24"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSalvarMeta} disabled={savingMeta}>
                {savingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar dados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aviso quando não há versão de pontos */}
      {semVersao && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="text-sm text-orange-900">
              <p className="font-medium">Esta etapa não tem versão de pontos selecionada.</p>
              <p>Os jogadores serão salvos com 0 pontos. Selecione uma versão acima e salve antes de lançar a classificação para ter os pontos calculados.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de classificação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classificação</CardTitle>
              <CardDescription>
                Lance todos os jogadores da etapa. Marque os premiados para gerar a coleta automaticamente.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={addLinha}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Jogador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {linhas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum jogador lançado. Clique em &quot;Adicionar Jogador&quot;.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Posição</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-right w-24">Pontos</TableHead>
                    <TableHead className="w-24 text-center">Premiado?</TableHead>
                    <TableHead className="w-40">Prêmio (chips)</TableHead>
                    <TableHead className="text-right w-32">Coleta gerada</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => {
                    const pontos = pontosMapa[l.posicao] || 0
                    const premio = parseFloat(l.premio_chips) || 0
                    const coleta = l.foi_premiado ? premio * (etapa.percentual_coleta / 100) : 0
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={l.posicao.toString()}
                            onChange={(e) => updateLinha(l.id, { posicao: parseInt(e.target.value) || 1 })}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <PlayerSelector
                            value={l.player_id}
                            onSelect={(playerId, player) => {
                              updateLinha(l.id, { player_id: playerId, player_nick: player?.nick || '' })
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {pontos > 0 ? pontos : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={l.foi_premiado}
                            onCheckedChange={(v) => updateLinha(l.id, { foi_premiado: !!v })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.premio_chips}
                            onChange={(e) => updateLinha(l.id, { premio_chips: e.target.value })}
                            placeholder="0,00"
                            disabled={!l.foi_premiado}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-orange-600">
                          {coleta > 0 ? formatChips(coleta) : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLinha(l.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">{linhas.length} jogadores</Badge>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Total coleta: {formatChips(totalColetaChips)}
                  </Badge>
                </div>
                <Button onClick={handleSalvarClassif} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Classificação
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
