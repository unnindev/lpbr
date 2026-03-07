-- ============================================
-- LIVEBR - Migration 004: Create Indexes & RLS
-- ============================================
-- Índices obrigatórios conforme seção 3.1 do spec
-- Row Level Security conforme seção 5.4
-- ============================================

-- ============================================
-- ÍNDICES: transactions
-- ============================================
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_player ON transactions(player_id);
CREATE INDEX idx_transactions_bank ON transactions(bank_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_operation ON transactions(operation_type);
CREATE INDEX idx_transactions_reconciled ON transactions(reconciled);
CREATE INDEX idx_transactions_acordo ON transactions(acordo_id);
CREATE INDEX idx_transactions_competencia ON transactions(competencia);

-- ============================================
-- ÍNDICES: players
-- ============================================
CREATE INDEX idx_players_nick ON players(nick);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_club_id ON players(club_id);

-- ============================================
-- ÍNDICES: audit_log
-- ============================================
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- ÍNDICES: outros
-- ============================================
CREATE INDEX idx_agents_player ON agents(player_id);
CREATE INDEX idx_agent_folders_agent ON agent_folders(agent_id);
CREATE INDEX idx_agent_folders_player ON agent_folders(player_id);
CREATE INDEX idx_ranking_transactions_player ON ranking_transactions(player_id);
CREATE INDEX idx_ranking_transactions_date ON ranking_transactions(date);
CREATE INDEX idx_costs_date ON costs(date);
CREATE INDEX idx_costs_bank ON costs(bank_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: Leitura (usuários autenticados)
-- ============================================

-- Users: apenas usuários autenticados podem ler
CREATE POLICY "users_read" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Players: usuários autenticados podem ler
CREATE POLICY "players_read" ON players
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Banks: usuários autenticados podem ler
CREATE POLICY "banks_read" ON banks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Transactions: usuários autenticados podem ler
CREATE POLICY "transactions_read" ON transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agents: usuários autenticados podem ler
CREATE POLICY "agents_read" ON agents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agent Folders: usuários autenticados podem ler
CREATE POLICY "agent_folders_read" ON agent_folders
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ranking Transactions: usuários autenticados podem ler
CREATE POLICY "ranking_transactions_read" ON ranking_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Costs: usuários autenticados podem ler
CREATE POLICY "costs_read" ON costs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Audit Log: usuários autenticados podem ler
CREATE POLICY "audit_log_read" ON audit_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- POLÍTICAS: Escrita (via service role no backend)
-- ============================================
-- INSERT/UPDATE/DELETE será feito via Server Actions usando service_role key
-- Por segurança, não permitimos escrita direta pelo client

-- Users: apenas service role pode inserir/atualizar
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);  -- Apenas o próprio usuário no signup

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (auth.uid() = id);  -- Apenas o próprio usuário pode atualizar

-- Para as demais tabelas, a escrita será via service_role (Server Actions)
-- O service_role bypassa RLS automaticamente

-- ============================================
-- NOTA: Service Role
-- ============================================
-- As Server Actions usam SUPABASE_SERVICE_ROLE_KEY
-- que bypassa todas as políticas RLS.
-- Isso permite que o backend faça todas as operações
-- enquanto o client só pode ler.
