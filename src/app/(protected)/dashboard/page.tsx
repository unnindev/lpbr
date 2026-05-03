import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatChips } from '@/lib/formatters'
import {
  Coins,
  Landmark,
  Users,
  Trophy,
  CreditCard,
  TrendingUp,
  Percent,
  PiggyBank,
  Wallet,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function getDashboardData() {
  const supabase = await createClient() as SupabaseClient

  // Buscar saldo geral via RPC
  const { data: saldoGeral } = await supabase.rpc('get_saldo_geral')

  // Contar jogadores
  const { count: playersCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Jogadores que já usaram ChipPix (distinct player_id em transactions com origem = CHIPPIX)
  const { data: chippixTx } = await supabase
    .from('transactions')
    .select('player_id')
    .eq('origem', 'CHIPPIX')
    .not('player_id', 'is', null)

  const chippixPlayerIds = new Set<string>(
    (chippixTx || [])
      .map((t: { player_id: string | null }) => t.player_id)
      .filter((id: string | null): id is string => !!id)
  )
  const playersChippix = chippixPlayerIds.size

  // Buscar saldos por banco
  const { data: bankBalances } = await supabase.rpc('get_all_bank_balances')

  // Dados do mês atual
  const now = new Date()
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endOfMonth = now.getMonth() === 11
    ? `${now.getFullYear() + 1}-01-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`

  // Rake do mês
  const { data: rakeData } = await supabase
    .from('transactions')
    .select('chips')
    .eq('operation_type', 'RAKE')
    .gte('date', startOfMonth)
    .lt('date', endOfMonth)

  const rakeMensal = (rakeData || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Rake Suprema do mês (entradas de dinheiro vindas da Suprema)
  const { data: rakeSupremaData } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'RAKE_SUPREMA')
    .gte('date', startOfMonth)
    .lt('date', endOfMonth)

  const rakeSupremaMensal = (rakeSupremaData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Custos do mês
  const { data: custosData } = await supabase
    .from('transactions')
    .select('value')
    .eq('operation_type', 'CUSTO_DESPESA')
    .gte('date', startOfMonth)
    .lt('date', endOfMonth)

  const custoMensal = (custosData || []).reduce((acc: number, t: { value: number }) => acc + (t.value || 0), 0)

  // Cashback do mês (todos os tipos)
  const { data: cashbackData } = await supabase
    .from('transactions')
    .select('chips, value, operation_type')
    .in('operation_type', ['RAKE_AGENTE', 'CASHBACK_FICHAS', 'CASHBACK_DINHEIRO', 'CASHBACK_PAGAMENTO_DIVIDA'])
    .gte('date', startOfMonth)
    .lt('date', endOfMonth)

  // Calcular cada tipo separadamente
  // RAKE_AGENTE é tratado como CASHBACK_FICHAS (legado)
  let cashbackDinheiro = 0
  let cashbackFichas = 0
  let cashbackPagamentoDivida = 0

  for (const t of cashbackData || []) {
    switch (t.operation_type) {
      case 'CASHBACK_DINHEIRO':
        cashbackDinheiro += t.value || 0
        break
      case 'CASHBACK_FICHAS':
      case 'RAKE_AGENTE': // Legado: tratar como fichas
        cashbackFichas += t.chips || 0
        break
      case 'CASHBACK_PAGAMENTO_DIVIDA':
        cashbackPagamentoDivida += t.chips || 0
        break
    }
  }

  // Total: fichas + dinheiro (tratando como mesma unidade)
  const cashbackTotal = cashbackDinheiro + cashbackFichas + cashbackPagamentoDivida

  return {
    saldoGeral: saldoGeral || {
      total_bancos: 0,
      credito_concedido: 0,
      fichas_circulacao: 0,
      saldo_ranking: 0,
      saldo_geral: 0,
    },
    playersCount: playersCount || 0,
    playersChippix,
    bankBalances: bankBalances || [],
    rakeMensal,
    rakeSupremaMensal,
    custoMensal,
    cashback: {
      dinheiro: cashbackDinheiro,
      fichas: cashbackFichas,
      pagamentoDivida: cashbackPagamentoDivida,
      total: cashbackTotal,
    },
  }
}

export default async function DashboardPage() {
  const {
    saldoGeral,
    playersCount,
    playersChippix,
    bankBalances,
    rakeMensal,
    rakeSupremaMensal,
    custoMensal,
    cashback,
  } = await getDashboardData()

  const now = new Date()
  const mesAtual = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const cards = [
    {
      title: 'Total em Fichas',
      value: formatChips(saldoGeral.fichas_circulacao),
      icon: Coins,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Caixa',
      value: formatCurrency(saldoGeral.total_bancos),
      icon: Landmark,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Jogadores Cadastrados',
      value: playersCount.toString(),
      icon: Users,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      details: [
        { label: 'ChipPix', value: `${playersChippix}/${playersCount}`, color: 'text-green-600' },
      ],
    },
    {
      title: 'Fichas Ranking',
      value: formatChips(saldoGeral.saldo_ranking),
      icon: Trophy,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Crédito Fornecido',
      value: formatCurrency(saldoGeral.credito_concedido),
      icon: CreditCard,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Saldo Geral',
      value: formatCurrency(saldoGeral.saldo_geral),
      icon: TrendingUp,
      color: saldoGeral.saldo_geral >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: saldoGeral.saldo_geral >= 0 ? 'bg-green-50' : 'bg-red-50',
      formula: `Caixa + Crédito - Fichas - Ranking`,
    },
  ]

  const monthlyCards = [
    {
      title: 'Rake PPPoker',
      value: formatChips(rakeMensal),
      icon: Percent,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Rake Suprema',
      value: formatCurrency(rakeSupremaMensal),
      icon: Coins,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Custo Mensal',
      value: formatCurrency(custoMensal),
      icon: PiggyBank,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do clube de poker</p>
      </div>

      {/* Cards principais */}
      <section>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-gray-500 tracking-wide">
                  {card.title}
                </CardTitle>
                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </div>
                {card.formula && (
                  <p className="text-xs text-gray-400 mt-2">{card.formula}</p>
                )}
                {card.details && card.details.length > 0 && (
                  <div className="mt-3 space-y-1 text-sm">
                    {card.details.map((d) => (
                      <div key={d.label} className="flex justify-between text-gray-500">
                        <span>{d.label}:</span>
                        <span className={`font-mono ${d.color}`}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Saldos por Banco */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-gray-400" />
          Saldos por Banco
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {bankBalances.map((bank: { bank_id: string; bank_name: string; saldo: number }) => {
            // Definir cores por banco
            const bankName = bank.bank_name.toLowerCase()
            let bgColor = 'bg-gray-600'
            if (bankName.includes('bradesco')) bgColor = 'bg-red-600'
            else if (bankName.includes('chippix') || bankName.includes('chip pix')) bgColor = 'bg-purple-600'
            else if (bankName.includes('cora')) bgColor = 'bg-pink-500'
            else if (bankName.includes('investimento')) bgColor = 'bg-gray-900'
            else if (bankName.includes('itau') || bankName.includes('itaú')) bgColor = 'bg-orange-500'
            else if (bankName.includes('santander')) bgColor = 'bg-red-400'

            return (
              <Card key={bank.bank_id} className={`hover:shadow-md transition-shadow ${bgColor}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-white/80 truncate">
                    {bank.bank_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold tracking-tight text-white">
                    {formatCurrency(bank.saldo)}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Dados Mensais */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
          Dados de {mesAtual}
        </h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {monthlyCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-gray-500 tracking-wide">
                  {card.title}
                </CardTitle>
                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Card Cashback Total com detalhamento */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 tracking-wide">
                Cashback Total
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-purple-50">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl lg:text-3xl font-bold tracking-tight text-purple-600">
                {formatChips(cashback.total)}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {cashback.dinheiro > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Dinheiro:</span>
                    <span className="font-mono">{formatCurrency(cashback.dinheiro)}</span>
                  </div>
                )}
                {cashback.fichas > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Fichas:</span>
                    <span className="font-mono">{formatChips(cashback.fichas)}</span>
                  </div>
                )}
                {cashback.pagamentoDivida > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Pag. Dívida:</span>
                    <span className="font-mono">{formatChips(cashback.pagamentoDivida)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
