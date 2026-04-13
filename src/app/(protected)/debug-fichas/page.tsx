'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export default async function DebugFichasPage() {
  const supabase = await createClient() as SupabaseClient

  // Resultado via RPC (confiável - roda direto no SQL sem limite)
  const { data: fichasRpc } = await supabase.rpc('get_fichas_circulacao')

  // Buscar totais por operation_type usando RPC customizada
  // Para evitar o limite de 1000 rows do Supabase, buscar por tipo individualmente
  const aumentamTypes = [
    'COMPRA_FICHAS',
    'CREDITO_FICHAS',
    'CASHBACK_FICHAS',
    'RANKING_PAGAMENTO_FICHAS',
    'ACORDO_PAGAMENTO',
    'AJUSTE_INICIAL',
    'RAKE_AGENTE',
  ]

  const diminuemTypes = [
    'SAQUE_FICHAS',
    'CREDITO_PAGAMENTO_FICHAS',
    'RANKING_COLETA',
    'ACORDO_COLETA',
    'RAKE',
  ]

  // Buscar totais por tipo individualmente (evita limite de 1000)
  const porTipo: Record<string, { total: number; count: number }> = {}

  // Buscar todos os tipos distintos
  const { data: distinctTypes } = await supabase
    .from('transactions')
    .select('operation_type')
    .not('operation_type', 'is', null)

  const allTypes = [...new Set((distinctTypes || []).map((t: { operation_type: string }) => t.operation_type))] as string[]

  for (const tipo of allTypes) {
    const { data: txsDoTipo, count } = await supabase
      .from('transactions')
      .select('chips', { count: 'exact' })
      .eq('operation_type', tipo)

    const total = (txsDoTipo || []).reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
    porTipo[tipo as string] = { total, count: count || (txsDoTipo || []).length }
  }

  // Transações com operation_type NULL (pendentes de conciliação)
  const { data: nullTx } = await supabase
    .from('transactions')
    .select('id, chips, notes, date, reconciled, player:players(nick)')
    .is('operation_type', null)
    .order('date', { ascending: false })

  const txNull = nullTx || []
  const totalChipsNull = txNull.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const envioNull = txNull.filter((t: { notes: string }) => t.notes?.includes('[ENVIO]'))
  const recebimentoNull = txNull.filter((t: { notes: string }) => t.notes?.includes('[RECEBIMENTO]'))
  const chipsEnvioNull = envioNull.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)
  const chipsRecebimentoNull = recebimentoNull.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Transações recentes (últimos 3 dias) para investigar
  const tresDiasAtras = new Date()
  tresDiasAtras.setDate(tresDiasAtras.getDate() - 3)
  const dataInicio = tresDiasAtras.toISOString().split('T')[0]

  const { data: recentTx } = await supabase
    .from('transactions')
    .select('id, date, operation_type, chips, value, notes, reconciled, origem, player:players(nick)')
    .gte('date', dataInicio)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const txRecentes = recentTx || []

  // Calcular totais
  let totalAumentam = 0
  let totalDiminuem = 0
  for (const tipo of aumentamTypes) {
    totalAumentam += porTipo[tipo]?.total || 0
  }
  for (const tipo of diminuemTypes) {
    totalDiminuem += porTipo[tipo]?.total || 0
  }

  // Tipos não contados
  const naoContados = allTypes.filter(
    (t: string) => !aumentamTypes.includes(t) && !diminuemTypes.includes(t)
  )

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Diagnóstico de Fichas em Circulação</h1>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm text-blue-600">Sistema (RPC)</p>
          <p className="text-3xl font-bold text-blue-900">{Number(fichasRpc || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-green-600">PPPoker (esperado)</p>
          <p className="text-3xl font-bold text-green-900">158.737,00</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-sm text-red-600">Diferença (faltam no sistema)</p>
          <p className="text-3xl font-bold text-red-900">{(158737 - Number(fichasRpc || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Cálculo detalhado */}
      <div className="grid grid-cols-2 gap-4">
        {/* AUMENTAM */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-green-700 mb-3">AUMENTAM circulação</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">Total Fichas</th>
              </tr>
            </thead>
            <tbody>
              {aumentamTypes.map((tipo) => (
                <tr key={tipo} className="border-b">
                  <td className="py-1 font-mono text-xs">{tipo}</td>
                  <td className="py-1 text-right">{porTipo[tipo]?.count || 0}</td>
                  <td className="py-1 text-right font-mono">{(porTipo[tipo]?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr className="font-bold bg-green-50">
                <td className="py-2">TOTAL</td>
                <td></td>
                <td className="py-2 text-right font-mono">{totalAumentam.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DIMINUEM */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-red-700 mb-3">DIMINUEM circulação</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">Total Fichas</th>
              </tr>
            </thead>
            <tbody>
              {diminuemTypes.map((tipo) => (
                <tr key={tipo} className="border-b">
                  <td className="py-1 font-mono text-xs">{tipo}</td>
                  <td className="py-1 text-right">{porTipo[tipo]?.count || 0}</td>
                  <td className="py-1 text-right font-mono">{(porTipo[tipo]?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr className="font-bold bg-red-50">
                <td className="py-2">TOTAL</td>
                <td></td>
                <td className="py-2 text-right font-mono">{totalDiminuem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Resultado do cálculo */}
      <div className="bg-gray-100 border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Resultado do Cálculo (JS - conferência)</h2>
        <p className="font-mono text-sm">
          {totalAumentam.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {totalDiminuem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = <strong>{(totalAumentam - totalDiminuem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">Deve bater com o valor do RPC acima. Se não bater, há um bug na query JS.</p>
      </div>

      {/* ALERTA: Transações não contadas com fichas */}
      {naoContados.some((t: string) => (porTipo[t]?.total || 0) > 0) && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
          <h2 className="font-semibold text-orange-800 mb-3">⚠️ Tipos NÃO CONTADOS que possuem fichas</h2>
          <p className="text-sm text-orange-700 mb-3">
            Estes operation_types têm fichas mas NÃO entram no cálculo de fichas em circulação.
            Se deveriam entrar, esta pode ser a causa da discrepância.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">Total Fichas</th>
              </tr>
            </thead>
            <tbody>
              {naoContados
                .filter((t: string) => (porTipo[t]?.total || 0) > 0)
                .map((tipo: string) => (
                  <tr key={tipo} className="border-b">
                    <td className="py-1 font-mono text-xs font-bold text-orange-800">{tipo}</td>
                    <td className="py-1 text-right">{porTipo[tipo]?.count || 0}</td>
                    <td className="py-1 text-right font-mono font-bold">{(porTipo[tipo]?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transações com operation_type NULL */}
      {txNull.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-800 mb-3">
            ⚠️ Transações PENDENTES (operation_type NULL) - {txNull.length} transações
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div className="bg-white p-2 rounded text-center">
              <p className="font-bold">{envioNull.length} envios</p>
              <p className="font-mono">{chipsEnvioNull.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} fichas</p>
              <p className="text-xs text-yellow-700">Deveriam AUMENTAR circulação</p>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <p className="font-bold">{recebimentoNull.length} recebimentos</p>
              <p className="font-mono">{chipsRecebimentoNull.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} fichas</p>
              <p className="text-xs text-yellow-700">Deveriam DIMINUIR circulação</p>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <p className="font-bold">Impacto líquido</p>
              <p className="font-mono font-bold">{(chipsEnvioNull - chipsRecebimentoNull).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-yellow-700">Fichas faltando no cálculo</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Data</th>
                <th className="pb-2">Jogador</th>
                <th className="pb-2 text-right">Fichas</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Notas</th>
                <th className="pb-2">Conc.</th>
              </tr>
            </thead>
            <tbody>
              {txNull.map((tx: { id: string; date: string; chips: number; notes: string; reconciled: boolean; player: { nick: string } | null }) => (
                <tr key={tx.id} className="border-b">
                  <td className="py-1">{tx.date}</td>
                  <td className="py-1">{tx.player?.nick || '-'}</td>
                  <td className="py-1 text-right font-mono">{(tx.chips || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1 text-xs">
                    {tx.notes?.includes('[ENVIO]') ? '📤 ENVIO' : tx.notes?.includes('[RECEBIMENTO]') ? '📥 RECEB.' : '❓'}
                  </td>
                  <td className="py-1 text-xs truncate max-w-[200px]">{tx.notes}</td>
                  <td className="py-1">{tx.reconciled ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transações recentes (últimos 3 dias) */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Transações dos últimos 3 dias ({txRecentes.length} transações)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Data</th>
              <th className="pb-2">Tipo</th>
              <th className="pb-2">Jogador</th>
              <th className="pb-2 text-right">Fichas</th>
              <th className="pb-2 text-right">Valor R$</th>
              <th className="pb-2">Origem</th>
              <th className="pb-2">Conc.</th>
              <th className="pb-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {txRecentes.map((tx: { id: string; date: string; operation_type: string; chips: number; value: number; notes: string; reconciled: boolean; origem: string; player: { nick: string } | null }) => (
              <tr key={tx.id} className="border-b hover:bg-gray-50">
                <td className="py-1 text-xs">{tx.date}</td>
                <td className="py-1 font-mono text-xs">
                  <span className={
                    !tx.operation_type ? 'text-yellow-600 font-bold' :
                    aumentamTypes.includes(tx.operation_type) ? 'text-green-600' :
                    diminuemTypes.includes(tx.operation_type) ? 'text-red-600' : 'text-gray-400'
                  }>
                    {tx.operation_type || 'NULL'}
                  </span>
                </td>
                <td className="py-1 text-xs">{tx.player?.nick || '-'}</td>
                <td className="py-1 text-right font-mono">{tx.chips ? tx.chips.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                <td className="py-1 text-right font-mono">{tx.value ? tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                <td className="py-1 text-xs">{tx.origem || '-'}</td>
                <td className="py-1">{tx.reconciled ? '✅' : '❌'}</td>
                <td className="py-1 text-xs truncate max-w-[150px]">{tx.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Todos os tipos */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Todos os operation_types</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Tipo</th>
              <th className="pb-2 text-right">Qtd</th>
              <th className="pb-2 text-right">Total Fichas</th>
              <th className="pb-2">Categoria</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(porTipo)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([tipo, data]) => (
                <tr key={tipo} className={`border-b ${!aumentamTypes.includes(tipo) && !diminuemTypes.includes(tipo) && data.total > 0 ? 'bg-orange-50 font-bold' : ''}`}>
                  <td className="py-1 font-mono text-xs">{tipo}</td>
                  <td className="py-1 text-right">{data.count}</td>
                  <td className="py-1 text-right font-mono">{data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1 text-xs">
                    {aumentamTypes.includes(tipo) ? '🟢 Aumenta' : diminuemTypes.includes(tipo) ? '🔴 Diminui' : '⚪ Não contada'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
