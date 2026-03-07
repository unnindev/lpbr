-- ============================================
-- LIVEBR - Migration 006: Seed Initial Data
-- ============================================
-- Dados iniciais do sistema
-- ============================================

-- ============================================
-- NOTA: Usuários
-- ============================================
-- Os usuários devem ser criados via Supabase Auth primeiro.
-- Depois de criar no Auth, insira na tabela users:
--
-- Usuário CODE (master): pedro.sato@gmail.com
-- Usuário ADMIN: sandrocasarini@gmail.com
--
-- Exemplo (substitua os UUIDs pelos reais do Auth):
/*
INSERT INTO users (id, name, role, is_active) VALUES
  ('UUID_DO_PEDRO', 'Pedro Sato', 'CODE', true),
  ('UUID_DO_SANDRO', 'Sandro Casarini', 'ADMIN', true);
*/

-- ============================================
-- Bancos iniciais (exemplo)
-- ============================================
-- Ajuste conforme os bancos que você usa:
/*
INSERT INTO banks (name, initial_balance, is_active) VALUES
  ('ChipPix', 0, true),
  ('Nubank', 0, true),
  ('Bradesco', 0, true);
*/

-- ============================================
-- IMPORTANTE: Ajuste Inicial
-- ============================================
-- Após criar os bancos, use o módulo "Ajuste Inicial" do sistema
-- para definir os saldos iniciais corretos.
-- Isso criará transações do tipo AJUSTE_INICIAL para cada banco.
