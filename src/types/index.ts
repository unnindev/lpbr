import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  OperationType,
  TransactionType,
  Origem,
  Club,
  Platform,
  RankingType,
  PaymentMethod,
  UserRole,
} from './database.types'

// Re-exportar tipos do banco
export type {
  OperationType,
  TransactionType,
  Origem,
  Club,
  Platform,
  RankingType,
  PaymentMethod,
  UserRole,
}

// Aliases para as tabelas
export type Transaction = Tables<'transactions'>
export type TransactionInsert = TablesInsert<'transactions'>
export type TransactionUpdate = TablesUpdate<'transactions'>

export type Player = Tables<'players'>
export type PlayerInsert = TablesInsert<'players'>
export type PlayerUpdate = TablesUpdate<'players'>

export type Agent = Tables<'agents'>
export type AgentInsert = TablesInsert<'agents'>
export type AgentUpdate = TablesUpdate<'agents'>

export type AgentFolder = Tables<'agent_folders'>
export type AgentFolderInsert = TablesInsert<'agent_folders'>
export type AgentFolderUpdate = TablesUpdate<'agent_folders'>

export type Bank = Tables<'banks'>
export type BankInsert = TablesInsert<'banks'>
export type BankUpdate = TablesUpdate<'banks'>

export type RankingTransaction = Tables<'ranking_transactions'>
export type RankingTransactionInsert = TablesInsert<'ranking_transactions'>
export type RankingTransactionUpdate = TablesUpdate<'ranking_transactions'>

export type Cost = Tables<'costs'>
export type CostInsert = TablesInsert<'costs'>
export type CostUpdate = TablesUpdate<'costs'>

export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type AuditLog = Tables<'audit_log'>
export type AuditLogInsert = TablesInsert<'audit_log'>

// Tipos de domínio específicos

/**
 * Jogador com informações de dívida
 */
export type PlayerWithDebt = Player & {
  divida_atual: number
}

/**
 * Agente com informações do jogador
 */
export type AgentWithPlayer = Agent & {
  player: Player
}

/**
 * Agente com pasta de jogadores
 */
export type AgentWithFolder = AgentWithPlayer & {
  players: Player[]
}

/**
 * Transação com informações relacionadas
 */
export type TransactionWithRelations = Transaction & {
  player?: Player | null
  bank?: Bank | null
}

/**
 * Resumo financeiro do dashboard
 */
export interface DashboardSummary {
  totalBancos: number
  creditoConcedido: number
  fichasCirculacao: number
  saldoRanking: number
  saldoGeral: number
  jogadoresCadastrados: number
}

/**
 * Resumo mensal para dashboard
 */
export interface MonthlySummary {
  rakeMensal: number
  custoMensal: number
  cashbackAgentes: number
}

/**
 * Resultado de uma operação de API
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Saldo de banco com detalhes
 */
export interface BankBalance {
  bank: Bank
  saldo: number
}

/**
 * Campos de formulário por tipo de operação
 */
export interface FieldsConfig {
  jogador: boolean
  banco: boolean
  fichas: boolean
  valor: boolean
  comprovante: boolean
  acordo?: boolean
}

/**
 * Mapa de campos por tipo de operação (conforme seção 6.4)
 */
export const CAMPOS_POR_TIPO: Record<OperationType, FieldsConfig> = {
  COMPRA_FICHAS: { jogador: true, banco: true, fichas: true, valor: true, comprovante: true },
  CREDITO_FICHAS: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false },
  SAQUE_FICHAS: { jogador: true, banco: true, fichas: true, valor: true, comprovante: false },
  CREDITO_PAGAMENTO_DINHEIRO: { jogador: true, banco: true, fichas: false, valor: true, comprovante: true },
  CREDITO_PAGAMENTO_FICHAS: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false },
  CUSTO_DESPESA: { jogador: false, banco: true, fichas: false, valor: true, comprovante: false },
  DEPOSITO_AVULSO: { jogador: false, banco: true, fichas: false, valor: true, comprovante: false },
  SAQUE_AVULSO: { jogador: false, banco: true, fichas: false, valor: true, comprovante: false },
  ACORDO_COLETA: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false, acordo: true },
  ACORDO_PAGAMENTO: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false, acordo: true },
  RANKING_COLETA: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false },
  RANKING_PAGAMENTO_FICHAS: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false },
  RANKING_PAGAMENTO_DINHEIRO: { jogador: true, banco: true, fichas: false, valor: true, comprovante: false },
  CASHBACK_DINHEIRO: { jogador: true, banco: true, fichas: false, valor: true, comprovante: false },
  CASHBACK_FICHAS: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false },
  CASHBACK_PAGAMENTO_DIVIDA: { jogador: true, banco: false, fichas: false, valor: true, comprovante: false },
  RAKE: { jogador: false, banco: false, fichas: true, valor: false, comprovante: false },
  RAKE_AGENTE: { jogador: true, banco: false, fichas: true, valor: false, comprovante: false },
  AJUSTE_INICIAL: { jogador: false, banco: true, fichas: true, valor: true, comprovante: false },
}

/**
 * Labels amigáveis para tipos de operação
 */
export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  COMPRA_FICHAS: 'Compra de Fichas',
  CREDITO_FICHAS: 'Crédito (Fichas)',
  SAQUE_FICHAS: 'Saque de Fichas',
  CREDITO_PAGAMENTO_DINHEIRO: 'Pagamento de Crédito (R$)',
  CREDITO_PAGAMENTO_FICHAS: 'Pagamento de Crédito (Fichas)',
  CUSTO_DESPESA: 'Custo/Despesa',
  DEPOSITO_AVULSO: 'Depósito Avulso',
  SAQUE_AVULSO: 'Saque Avulso',
  ACORDO_COLETA: 'Acordo (Coleta)',
  ACORDO_PAGAMENTO: 'Acordo (Pagamento)',
  RANKING_COLETA: 'Ranking (Coleta)',
  RANKING_PAGAMENTO_FICHAS: 'Ranking (Pagamento Fichas)',
  RANKING_PAGAMENTO_DINHEIRO: 'Ranking (Pagamento R$)',
  CASHBACK_DINHEIRO: 'Cashback (R$)',
  CASHBACK_FICHAS: 'Cashback (Fichas)',
  CASHBACK_PAGAMENTO_DIVIDA: 'Cashback (Abate Dívida)',
  RAKE: 'Rake',
  RAKE_AGENTE: 'Rake Agente',
  AJUSTE_INICIAL: 'Ajuste Inicial',
}
