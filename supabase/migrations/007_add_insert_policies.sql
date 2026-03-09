-- ============================================
-- LIVEBR - Migration 007: Add INSERT/UPDATE policies
-- ============================================
-- Permite que usuários autenticados façam INSERT/UPDATE
-- ============================================

-- Players: usuários autenticados podem inserir
CREATE POLICY "players_insert" ON players
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Players: usuários autenticados podem atualizar
CREATE POLICY "players_update" ON players
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Banks: usuários autenticados podem inserir
CREATE POLICY "banks_insert" ON banks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Banks: usuários autenticados podem atualizar
CREATE POLICY "banks_update" ON banks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Transactions: usuários autenticados podem inserir
CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Transactions: usuários autenticados podem atualizar
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Costs: usuários autenticados podem inserir
CREATE POLICY "costs_insert" ON costs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Costs: usuários autenticados podem atualizar
CREATE POLICY "costs_update" ON costs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Ranking Transactions: usuários autenticados podem inserir
CREATE POLICY "ranking_transactions_insert" ON ranking_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ranking Transactions: usuários autenticados podem atualizar
CREATE POLICY "ranking_transactions_update" ON ranking_transactions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Audit Log: usuários autenticados podem inserir
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Agents: usuários autenticados podem inserir
CREATE POLICY "agents_insert" ON agents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Agents: usuários autenticados podem atualizar
CREATE POLICY "agents_update" ON agents
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Agent Folders: usuários autenticados podem inserir
CREATE POLICY "agent_folders_insert" ON agent_folders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Agent Folders: usuários autenticados podem atualizar
CREATE POLICY "agent_folders_update" ON agent_folders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Transactions: usuários autenticados podem deletar
CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE USING (auth.uid() IS NOT NULL);
