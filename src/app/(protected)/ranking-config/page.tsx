'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Plus, Copy, Star, Trash2, Save, Edit2 } from 'lucide-react'
import {
  listarVersoesPontos,
  listarItensPontos,
  criarVersaoPontos,
  renomearVersaoPontos,
  ativarVersaoPontos,
  excluirVersaoPontos,
  salvarItensPontos,
  listarVersoesPremiacao,
  listarItensPremiacao,
  criarVersaoPremiacao,
  renomearVersaoPremiacao,
  ativarVersaoPremiacao,
  excluirVersaoPremiacao,
  salvarItensPremiacao,
  getDefaultColetaPercentual,
  setDefaultColetaPercentual,
  type VersaoPontos,
  type VersaoPremiacao,
} from '@/actions/ranking-config'

const POSICOES_PONTOS = Array.from({ length: 20 }, (_, i) => i + 1)
const POSICOES_PREMIACAO_DEFAULT = Array.from({ length: 10 }, (_, i) => i + 1)

export default function RankingConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações de Ranking</h1>
        <p className="text-gray-500">Tabelas de pontos, premiação e configurações gerais</p>
      </div>

      <Tabs defaultValue="pontos">
        <TabsList>
          <TabsTrigger value="pontos">Tabela de Pontos</TabsTrigger>
          <TabsTrigger value="premiacao">Tabela de Premiação</TabsTrigger>
          <TabsTrigger value="geral">Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="pontos" className="mt-4">
          <PontosSection />
        </TabsContent>

        <TabsContent value="premiacao" className="mt-4">
          <PremiacaoSection />
        </TabsContent>

        <TabsContent value="geral" className="mt-4">
          <GeralSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// PONTOS
// ============================================================

function PontosSection() {
  const [versoes, setVersoes] = useState<VersaoPontos[]>([])
  const [versaoId, setVersaoId] = useState<string>('')
  const [valores, setValores] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [novaOpen, setNovaOpen] = useState(false)
  const [novaLabel, setNovaLabel] = useState('')
  const [clonar, setClonar] = useState(true)
  const [renomearOpen, setRenomearOpen] = useState(false)
  const [renomearLabel, setRenomearLabel] = useState('')

  const loadVersoes = useCallback(async () => {
    const lista = await listarVersoesPontos()
    setVersoes(lista)
    if (lista.length > 0 && !versaoId) {
      const ativa = lista.find(v => v.ativa)
      setVersaoId(ativa?.id || lista[0].id)
    } else if (lista.length === 0) {
      setVersaoId('')
      setValores({})
    }
    setLoading(false)
  }, [versaoId])

  const loadItens = useCallback(async (id: string) => {
    if (!id) return
    const itens = await listarItensPontos(id)
    const mapa: Record<number, string> = {}
    POSICOES_PONTOS.forEach(p => { mapa[p] = '' })
    itens.forEach(i => { mapa[i.posicao] = i.pontos.toString() })
    setValores(mapa)
  }, [])

  useEffect(() => { loadVersoes() }, [loadVersoes])
  useEffect(() => { if (versaoId) loadItens(versaoId) }, [versaoId, loadItens])

  const versaoAtual = versoes.find(v => v.id === versaoId)

  const handleNova = async () => {
    if (!novaLabel.trim()) return toast.error('Informe o nome da versão')
    const result = await criarVersaoPontos(novaLabel.trim(), clonar ? versaoId : undefined)
    if (result.success && result.id) {
      toast.success('Versão criada')
      setNovaOpen(false)
      setNovaLabel('')
      await loadVersoes()
      setVersaoId(result.id)
    } else {
      toast.error(result.error || 'Erro ao criar')
    }
  }

  const handleRenomear = async () => {
    if (!renomearLabel.trim() || !versaoId) return
    const r = await renomearVersaoPontos(versaoId, renomearLabel.trim())
    if (r.success) {
      toast.success('Renomeada')
      setRenomearOpen(false)
      loadVersoes()
    } else toast.error(r.error || 'Erro')
  }

  const handleAtivar = async () => {
    if (!versaoId) return
    const r = await ativarVersaoPontos(versaoId)
    if (r.success) { toast.success('Versão ativada'); loadVersoes() }
    else toast.error(r.error || 'Erro')
  }

  const handleExcluir = async () => {
    if (!versaoId) return
    if (!confirm('Excluir esta versão? Itens serão perdidos.')) return
    const r = await excluirVersaoPontos(versaoId)
    if (r.success) {
      toast.success('Excluída')
      setVersaoId('')
      loadVersoes()
    } else toast.error(r.error || 'Erro')
  }

  const handleSalvar = async () => {
    if (!versaoId) return
    setSaving(true)
    const itens = POSICOES_PONTOS
      .map(p => ({ posicao: p, pontos: parseFloat(valores[p] || '0') || 0 }))
      .filter(i => i.pontos > 0)
    const r = await salvarItensPontos(versaoId, itens)
    if (r.success) toast.success('Pontos salvos')
    else toast.error(r.error || 'Erro')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Tabela de Pontos</CardTitle>
            <CardDescription>Pontuação por posição (1º a 20º). Versão ativa é usada como default em novas etapas.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {versoes.length > 0 && (
              <Select value={versaoId} onValueChange={(v) => v && setVersaoId(v)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione a versão" />
                </SelectTrigger>
                <SelectContent>
                  {versoes.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}{v.ativa ? ' (ativa)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => setNovaOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
            {versaoAtual && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setRenomearLabel(versaoAtual.label); setRenomearOpen(true) }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                {!versaoAtual.ativa && (
                  <Button variant="outline" size="sm" onClick={handleAtivar}>
                    <Star className="h-4 w-4 mr-1" /> Tornar ativa
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExcluir} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : versoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma versão criada ainda. Clique em &quot;Nova&quot; para começar.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              {versaoAtual?.ativa && <Badge className="bg-green-600">Ativa</Badge>}
              <span className="text-sm text-gray-500">
                Os pontos são fotografados (snapshot) na hora de salvar a classificação — alterar aqui não muda etapas passadas.
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Posição</TableHead>
                  <TableHead className="w-48">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {POSICOES_PONTOS.map(p => (
                  <TableRow key={p}>
                    <TableCell className="font-medium">{p}º</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valores[p] || ''}
                        onChange={(e) => setValores(prev => ({ ...prev, [p]: e.target.value }))}
                        className="w-32"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSalvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Pontos
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova versão de pontos</DialogTitle>
            <DialogDescription>Crie uma nova versão da tabela de pontos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome / descrição</Label>
              <Input value={novaLabel} onChange={(e) => setNovaLabel(e.target.value)} placeholder="ex: Tabela 2026 v1" />
            </div>
            {versaoId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={clonar} onChange={(e) => setClonar(e.target.checked)} />
                Clonar valores da versão atual
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={handleNova}><Plus className="h-4 w-4 mr-1" />Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renomearOpen} onOpenChange={setRenomearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear versão</DialogTitle>
          </DialogHeader>
          <Input value={renomearLabel} onChange={(e) => setRenomearLabel(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenomearOpen(false)}>Cancelar</Button>
            <Button onClick={handleRenomear}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// PREMIAÇÃO
// ============================================================

function PremiacaoSection() {
  const [versoes, setVersoes] = useState<VersaoPremiacao[]>([])
  const [versaoId, setVersaoId] = useState<string>('')
  const [valores, setValores] = useState<Record<number, string>>({})
  const [posicoes, setPosicoes] = useState<number[]>(POSICOES_PREMIACAO_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [novaOpen, setNovaOpen] = useState(false)
  const [novaLabel, setNovaLabel] = useState('')
  const [clonar, setClonar] = useState(true)
  const [renomearOpen, setRenomearOpen] = useState(false)
  const [renomearLabel, setRenomearLabel] = useState('')

  const loadVersoes = useCallback(async () => {
    const lista = await listarVersoesPremiacao()
    setVersoes(lista)
    if (lista.length > 0 && !versaoId) {
      const ativa = lista.find(v => v.ativa)
      setVersaoId(ativa?.id || lista[0].id)
    } else if (lista.length === 0) {
      setVersaoId('')
      setValores({})
    }
    setLoading(false)
  }, [versaoId])

  const loadItens = useCallback(async (id: string) => {
    if (!id) return
    const itens = await listarItensPremiacao(id)
    const mapa: Record<number, string> = {}
    if (itens.length === 0) {
      POSICOES_PREMIACAO_DEFAULT.forEach(p => { mapa[p] = '' })
      setPosicoes(POSICOES_PREMIACAO_DEFAULT)
    } else {
      const maxPos = Math.max(...itens.map(i => i.posicao))
      const range = Array.from({ length: maxPos }, (_, i) => i + 1)
      range.forEach(p => { mapa[p] = '' })
      itens.forEach(i => { mapa[i.posicao] = i.percentual.toString() })
      setPosicoes(range)
    }
    setValores(mapa)
  }, [])

  useEffect(() => { loadVersoes() }, [loadVersoes])
  useEffect(() => { if (versaoId) loadItens(versaoId) }, [versaoId, loadItens])

  const versaoAtual = versoes.find(v => v.id === versaoId)
  const totalPercentual = posicoes.reduce((acc, p) => acc + (parseFloat(valores[p] || '0') || 0), 0)

  const handleAddPos = () => {
    const next = posicoes.length + 1
    setPosicoes([...posicoes, next])
    setValores(prev => ({ ...prev, [next]: '' }))
  }

  const handleRemovePos = () => {
    if (posicoes.length === 0) return
    const last = posicoes[posicoes.length - 1]
    setPosicoes(posicoes.slice(0, -1))
    setValores(prev => {
      const novo = { ...prev }
      delete novo[last]
      return novo
    })
  }

  const handleNova = async () => {
    if (!novaLabel.trim()) return toast.error('Informe o nome da versão')
    const result = await criarVersaoPremiacao(novaLabel.trim(), clonar ? versaoId : undefined)
    if (result.success && result.id) {
      toast.success('Versão criada')
      setNovaOpen(false)
      setNovaLabel('')
      await loadVersoes()
      setVersaoId(result.id)
    } else {
      toast.error(result.error || 'Erro ao criar')
    }
  }

  const handleRenomear = async () => {
    if (!renomearLabel.trim() || !versaoId) return
    const r = await renomearVersaoPremiacao(versaoId, renomearLabel.trim())
    if (r.success) { toast.success('Renomeada'); setRenomearOpen(false); loadVersoes() }
    else toast.error(r.error || 'Erro')
  }

  const handleAtivar = async () => {
    if (!versaoId) return
    const r = await ativarVersaoPremiacao(versaoId)
    if (r.success) { toast.success('Versão ativada'); loadVersoes() }
    else toast.error(r.error || 'Erro')
  }

  const handleExcluir = async () => {
    if (!versaoId) return
    if (!confirm('Excluir esta versão? Itens serão perdidos.')) return
    const r = await excluirVersaoPremiacao(versaoId)
    if (r.success) {
      toast.success('Excluída')
      setVersaoId('')
      loadVersoes()
    } else toast.error(r.error || 'Erro')
  }

  const handleSalvar = async () => {
    if (!versaoId) return
    setSaving(true)
    const itens = posicoes
      .map(p => ({ posicao: p, percentual: parseFloat(valores[p] || '0') || 0 }))
      .filter(i => i.percentual > 0)
    const r = await salvarItensPremiacao(versaoId, itens)
    if (r.success) toast.success('Premiação salva')
    else toast.error(r.error || 'Erro')
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Tabela de Premiação</CardTitle>
            <CardDescription>Percentual do pool por posição final do ranking. A soma deve dar 100%.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {versoes.length > 0 && (
              <Select value={versaoId} onValueChange={(v) => v && setVersaoId(v)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione a versão" />
                </SelectTrigger>
                <SelectContent>
                  {versoes.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}{v.ativa ? ' (ativa)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => setNovaOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
            {versaoAtual && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setRenomearLabel(versaoAtual.label); setRenomearOpen(true) }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                {!versaoAtual.ativa && (
                  <Button variant="outline" size="sm" onClick={handleAtivar}>
                    <Star className="h-4 w-4 mr-1" /> Tornar ativa
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExcluir} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : versoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma versão criada ainda. Clique em &quot;Nova&quot; para começar.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {versaoAtual?.ativa && <Badge className="bg-green-600">Ativa</Badge>}
                <span className={`text-sm font-mono ${Math.abs(totalPercentual - 100) < 0.001 ? 'text-green-600' : 'text-orange-600'}`}>
                  Soma: {totalPercentual.toFixed(2)}%
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRemovePos} disabled={posicoes.length === 0}>−</Button>
                <Button variant="outline" size="sm" onClick={handleAddPos}>+</Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Posição</TableHead>
                  <TableHead className="w-48">Percentual (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posicoes.map(p => (
                  <TableRow key={p}>
                    <TableCell className="font-medium">{p}º</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={valores[p] || ''}
                        onChange={(e) => setValores(prev => ({ ...prev, [p]: e.target.value }))}
                        className="w-32"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSalvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Premiação
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova versão de premiação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome / descrição</Label>
              <Input value={novaLabel} onChange={(e) => setNovaLabel(e.target.value)} placeholder="ex: Premiação 2026 v1" />
            </div>
            {versaoId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={clonar} onChange={(e) => setClonar(e.target.checked)} />
                Clonar valores da versão atual
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={handleNova}><Plus className="h-4 w-4 mr-1" />Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renomearOpen} onOpenChange={setRenomearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear versão</DialogTitle>
          </DialogHeader>
          <Input value={renomearLabel} onChange={(e) => setRenomearLabel(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenomearOpen(false)}>Cancelar</Button>
            <Button onClick={handleRenomear}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// GERAL
// ============================================================

function GeralSection() {
  const [defaultColeta, setDefaultColeta] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDefaultColetaPercentual().then(v => {
      setDefaultColeta(v.toString())
      setLoading(false)
    })
  }, [])

  const handleSalvar = async () => {
    const v = parseFloat(defaultColeta) || 0
    if (v < 0 || v > 100) return toast.error('Percentual deve estar entre 0 e 100')
    setSaving(true)
    const r = await setDefaultColetaPercentual(v)
    if (r.success) toast.success('Salvo')
    else toast.error(r.error || 'Erro')
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações Gerais</CardTitle>
        <CardDescription>Valores padrão usados ao criar novas etapas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Percentual padrão de coleta</Label>
          <p className="text-sm text-gray-500 mb-2">
            Usado como default quando uma nova etapa é criada. Pode ser alterado por etapa individualmente.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={defaultColeta}
              onChange={(e) => setDefaultColeta(e.target.value)}
              className="w-32"
            />
            <span className="text-gray-500">%</span>
            <Button onClick={handleSalvar} disabled={saving} className="ml-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
