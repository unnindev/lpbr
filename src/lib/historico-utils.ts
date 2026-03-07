// Mapeamento de nomes de tabelas para exibição
export function formatTableName(tableName: string): string {
  const map: Record<string, string> = {
    transactions: 'Transações',
    players: 'Jogadores',
    banks: 'Bancos',
    users: 'Usuários',
    agents: 'Agentes',
    agent_players: 'Jogadores de Agentes',
    ranking_transactions: 'Ranking',
    costs: 'Custos',
    rake_entries: 'Rake',
  }
  return map[tableName] || tableName
}

// Mapeamento de ações para exibição
export function formatAction(action: string): string {
  const map: Record<string, string> = {
    INSERT: 'Criação',
    UPDATE: 'Atualização',
    DELETE: 'Exclusão',
  }
  return map[action] || action
}
