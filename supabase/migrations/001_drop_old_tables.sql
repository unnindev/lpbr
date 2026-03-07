-- ============================================
-- LIVEBR - Migration 001: Drop Old Tables
-- ============================================
-- ATENÇÃO: Este script apaga TODAS as tabelas do sistema antigo!
-- Certifique-se de ter feito backup dos jogadores antes de executar.
-- ============================================

-- Desabilitar verificação de foreign keys temporariamente
SET session_replication_role = 'replica';

-- Dropar todas as tabelas antigas
DROP TABLE IF EXISTS agentes CASCADE;
DROP TABLE IF EXISTS agentes_pasta CASCADE;
DROP TABLE IF EXISTS bancos CASCADE;
DROP TABLE IF EXISTS conciliacoes_diarias CASCADE;
DROP TABLE IF EXISTS historico CASCADE;
DROP TABLE IF EXISTS jogadores CASCADE;
DROP TABLE IF EXISTS logs_pppoker CASCADE;
DROP TABLE IF EXISTS rake_agentes_pppoker CASCADE;
DROP TABLE IF EXISTS rake_agentes_suprema CASCADE;
DROP TABLE IF EXISTS rake_semanal_pppoker CASCADE;
DROP TABLE IF EXISTS rake_semanal_suprema CASCADE;
DROP TABLE IF EXISTS rakes CASCADE;
DROP TABLE IF EXISTS rakes_semanais CASCADE;
DROP TABLE IF EXISTS ranking_historico CASCADE;
DROP TABLE IF EXISTS ranking_historico_itens CASCADE;
DROP TABLE IF EXISTS transacoes CASCADE;
DROP TABLE IF EXISTS transacoes_caixa CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- Reabilitar verificação de foreign keys
SET session_replication_role = 'origin';

-- Confirmar que as tabelas foram removidas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
