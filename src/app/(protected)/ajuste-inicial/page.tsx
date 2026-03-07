'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { salvarAjusteInicial, verificarAjusteInicial } from '@/actions/ajuste-inicial'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/formatters'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Bank {
  id: string
  name: string
  initial_balance: number
}

export default function AjusteInicialPage() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [fichasCirculacao, setFichasCirculacao] = useState('')
  const [saldoRanking, setSaldoRanking] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [jaRealizado, setJaRealizado] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Verificar se já foi realizado
      const { jaRealizado } = await verificarAjusteInicial()
      setJaRealizado(jaRealizado)

      // Carregar bancos
      const { data: banksData } = await supabase
        .from('banks')
        .select('id, name, initial_balance')
        .eq('is_active', true)
        .order('name') as { data: Bank[] | null }

      if (banksData) {
        setBanks(banksData as Bank[])
        // Inicializar valores com os saldos atuais
        const initialValues: Record<string, string> = {}
        banksData.forEach(bank => {
          initialValues[bank.id] = bank.initial_balance.toString()
        })
        setValores(initialValues)
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  const handleValorChange = (bankId: string, value: string) => {
    // Permitir apenas números e ponto/vírgula
    const sanitized = value.replace(/[^\d.,]/g, '').replace(',', '.')
    setValores(prev => ({ ...prev, [bankId]: sanitized }))
  }

  const handleSubmit = async () => {
    setSaving(true)

    try {
      const bancosData = banks.map(bank => ({
        id: bank.id,
        valor: parseFloat(valores[bank.id] || '0') || 0,
      }))

      const result = await salvarAjusteInicial({
        bancos: bancosData,
        fichasCirculacao: parseFloat(fichasCirculacao) || 0,
        saldoRanking: parseFloat(saldoRanking) || 0,
      })

      if (result.success) {
        toast.success('Ajuste inicial salvo com sucesso!')
        router.push('/dashboard')
      } else {
        toast.error(result.error || 'Erro ao salvar ajuste inicial')
      }
    } catch {
      toast.error('Erro ao salvar ajuste inicial')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajuste Inicial</h1>
        <p className="text-gray-500">Configure os saldos iniciais do sistema</p>
      </div>

      {/* Aviso de uso único */}
      <Alert variant={jaRealizado ? 'default' : 'destructive'} className={jaRealizado ? 'border-green-500 bg-green-50' : ''}>
        {jaRealizado ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle>
          {jaRealizado ? 'Ajuste já realizado' : 'Atenção - Uso único'}
        </AlertTitle>
        <AlertDescription>
          {jaRealizado
            ? 'O ajuste inicial já foi realizado anteriormente. Os valores abaixo são apenas para visualização.'
            : 'Este ajuste deve ser feito apenas uma vez, no início da operação do sistema. Os valores definidos aqui serão a base para todos os cálculos.'}
        </AlertDescription>
      </Alert>

      {/* Saldos dos Bancos */}
      <Card>
        <CardHeader>
          <CardTitle>Saldos dos Bancos</CardTitle>
          <CardDescription>
            Informe o saldo atual de cada conta bancária
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {banks.map(bank => {
            const valorAtual = parseFloat(valores[bank.id] || '0') || 0
            const saldoOriginal = bank.initial_balance
            const isMatch = valorAtual === saldoOriginal && saldoOriginal > 0

            return (
              <div key={bank.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor={bank.id}>{bank.name}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500">R$</span>
                    <Input
                      id={bank.id}
                      type="text"
                      inputMode="decimal"
                      value={valores[bank.id] || ''}
                      onChange={(e) => handleValorChange(bank.id, e.target.value)}
                      placeholder="0,00"
                      disabled={jaRealizado}
                      className="max-w-[200px]"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Atual: {formatCurrency(saldoOriginal)}
                </div>
                {isMatch && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Fichas em Circulação */}
      <Card>
        <CardHeader>
          <CardTitle>Total em Fichas</CardTitle>
          <CardDescription>
            Informe o total de fichas em circulação no momento (conforme PPPoker)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Fichas:</span>
            <Input
              type="text"
              inputMode="decimal"
              value={fichasCirculacao}
              onChange={(e) => setFichasCirculacao(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
              placeholder="0,00"
              disabled={jaRealizado}
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Saldo Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Saldo Ranking</CardTitle>
          <CardDescription>
            Informe o saldo atual do pool de ranking (fichas já coletadas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Fichas:</span>
            <Input
              type="text"
              inputMode="decimal"
              value={saldoRanking}
              onChange={(e) => setSaldoRanking(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
              placeholder="0,00"
              disabled={jaRealizado}
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      {!jaRealizado && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Ajuste Inicial'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
