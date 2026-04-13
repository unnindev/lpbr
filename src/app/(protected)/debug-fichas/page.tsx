'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export default async function DebugFichasPage() {
  const supabase = await createClient() as SupabaseClient

  // 1. Fichas que AUMENTAM circulação
  const aumentamTypes = [
    'COMPRA_FICHAS',
    'CREDITO_FICHAS',
    'CASHBACK_FICHAS',
    'RANKING_PAGAMENTO_FICHAS',
    'ACORDO_PAGAMENTO',
    'AJUSTE_INICIAL',
    'RAKE_AGENTE',
  ]

  // 2. Fichas que DIMINUEM circulação
  const diminuemTypes = [
    'SAQUE_FICHAS',
    'CREDITO_PAGAMENTO_FICHAS',
    'RANKING_COLETA',
    'ACORDO_COLETA',
    'RAKE',
  ]

  // Buscar totais por operation_type
  const { data: allTx } = await supabase
    .from('transactions')
    .select('operation_type, chips, reconciled')
    .not('operation_type', 'is', null)

  const txs = allTx || []

  // Agrupar por operation_type
  const porTipo: Record<string, { total: number; count: number; naoReconciliadas: number; chipsNaoReconciliadas: number }> = {}

  for (const tx of txs) {
    const tipo = tx.operation_type
    if (!porTipo[tipo]) {
      porTipo[tipo] = { total: 0, count: 0, naoReconciliadas: 0, chipsNaoReconciliadas: 0 }
    }
    porTipo[tipo].total += tx.chips || 0
    porTipo[tipo].count += 1
    if (!tx.reconciled) {
      porTipo[tipo].naoReconciliadas += 1
      porTipo[tipo].chipsNaoReconciliadas += tx.chips || 0
    }
  }

  // Transações com operation_type NULL
  const { data: nullTx } = await supabase
    .from('transactions')
    .select('id, chips, notes, date, reconciled, player:players(nick)')
    .is('operation_type', null)

  const txNull = nullTx || []
  const totalChipsNull = txNull.reduce((acc: number, t: { chips: number }) => acc + (t.chips || 0), 0)

  // Calcular totais
  let totalAumentam = 0
  let totalDiminuem = 0
  for (const tipo of aumentamTypes) {
    totalAumentam += porTipo[tipo]?.total || 0
  }
  for (const tipo of diminuemTypes) {
    totalDiminuem += porTipo[tipo]?.total || 0
  }

  // Resultado via RPC
  const { data: fichasRpc } = await supabase.rpc('get_fichas_circulacao')

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Diagnóstico de Fichas em Circulação</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm text-blue-600">Via RPC (get_fichas_circulacao)</p>
          <p className="text-3xl font-bold text-blue-900">{fichasRpc}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-green-600">PPPoker (esperado)</p>
          <p className="text-3xl font-bold text-green-900">158.737</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-sm text-red-600">Diferença</p>
          <p className="text-3xl font-bold text-red-900">{158737 - (fichasRpc || 0)}</p>
        </div>
      </div>

      {/* Fichas que AUMENTAM */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold text-green-700 mb-3">Fichas que AUMENTAM circulação</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Tipo</th>
              <th className="pb-2 text-right">Qtd</th>
              <th className="pb-2 text-right">Total Fichas</th>
              <th className="pb-2 text-right">Não Conciliadas</th>
              <th className="pb-2 text-right">Fichas Não Conc.</th>
            </tr>
          </thead>
          <tbody>
            {aumentamTypes.map((tipo) => (
              <tr key={tipo} className="border-b">
                <td className="py-1 font-mono text-xs">{tipo}</td>
                <td className="py-1 text-right">{porTipo[tipo]?.count || 0}</td>
                <td className="py-1 text-right font-mono">{(porTipo[tipo]?.total || 0).toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right text-orange-600">{porTipo[tipo]?.naoReconciliadas || 0}</td>
                <td className="py-1 text-right text-orange-600 font-mono">{(porTipo[tipo]?.chipsNaoReconciliadas || 0).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            <tr className="font-bold bg-green-50">
              <td className="py-2">TOTAL AUMENTAM</td>
              <td></td>
              <td className="py-2 text-right font-mono">{totalAumentam.toLocaleString('pt-BR')}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Fichas que DIMINUEM */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold text-red-700 mb-3">Fichas que DIMINUEM circulação</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Tipo</th>
              <th className="pb-2 text-right">Qtd</th>
              <th className="pb-2 text-right">Total Fichas</th>
              <th className="pb-2 text-right">Não Conciliadas</th>
              <th className="pb-2 text-right">Fichas Não Conc.</th>
            </tr>
          </thead>
          <tbody>
            {diminuemTypes.map((tipo) => (
              <tr key={tipo} className="border-b">
                <td className="py-1 font-mono text-xs">{tipo}</td>
                <td className="py-1 text-right">{porTipo[tipo]?.count || 0}</td>
                <td className="py-1 text-right font-mono">{(porTipo[tipo]?.total || 0).toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right text-orange-600">{porTipo[tipo]?.naoReconciliadas || 0}</td>
                <td className="py-1 text-right text-orange-600 font-mono">{(porTipo[tipo]?.chipsNaoReconciliadas || 0).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            <tr className="font-bold bg-red-50">
              <td className="py-2">TOTAL DIMINUEM</td>
              <td></td>
              <td className="py-2 text-right font-mono">{totalDiminuem.toLocaleString('pt-BR')}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resultado */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Cálculo</h2>
        <p className="font-mono text-sm">
          {totalAumentam.toLocaleString('pt-BR')} - {totalDiminuem.toLocaleString('pt-BR')} = <strong>{(totalAumentam - totalDiminuem).toLocaleString('pt-BR')}</strong>
        </p>
      </div>

      {/* Transações com operation_type NULL */}
      {txNull.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-800 mb-3">
            Transações com operation_type NULL ({txNull.length} transações, {totalChipsNull.toLocaleString('pt-BR')} fichas)
          </h2>
          <p className="text-sm text-yellow-700 mb-3">
            Estas transações NÃO estão sendo contadas no cálculo de fichas em circulação.
            Se forem ENVIO, estão faltando 670 fichas.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Data</th>
                <th className="pb-2">Jogador</th>
                <th className="pb-2 text-right">Fichas</th>
                <th className="pb-2">Notas</th>
                <th className="pb-2">Reconciliada</th>
              </tr>
            </thead>
            <tbody>
              {txNull.map((tx: { id: string; date: string; chips: number; notes: string; reconciled: boolean; player: { nick: string } | null }) => (
                <tr key={tx.id} className="border-b">
                  <td className="py-1">{tx.date}</td>
                  <td className="py-1">{tx.player?.nick || '-'}</td>
                  <td className="py-1 text-right font-mono">{(tx.chips || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-1 text-xs">{tx.notes}</td>
                  <td className="py-1">{tx.reconciled ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Outros tipos não categorizados */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Todos os operation_types encontrados</h2>
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
                <tr key={tipo} className="border-b">
                  <td className="py-1 font-mono text-xs">{tipo}</td>
                  <td className="py-1 text-right">{data.count}</td>
                  <td className="py-1 text-right font-mono">{data.total.toLocaleString('pt-BR')}</td>
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
