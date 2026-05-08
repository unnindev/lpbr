-- ============================================
-- LIVEBR - Migration 015: Mover rebuys_addons para etapa
-- ============================================
-- Antes: rebuys_addons era por jogador (em ranking_classificacoes).
-- Agora: número único por etapa (em ranking_etapas).
-- Como ainda não foi preenchido em produção, dropamos a coluna antiga
-- sem migração de dados.
-- ============================================

ALTER TABLE ranking_classificacoes
  DROP COLUMN IF EXISTS rebuys_addons;

ALTER TABLE ranking_etapas
  ADD COLUMN IF NOT EXISTS rebuys_addons INTEGER NOT NULL DEFAULT 0;
