-- ============================================
-- LIVEBR - Migration 016: Separar rebuys e addons
-- ============================================
-- Antes: rebuys_addons (campo único combinando os dois).
-- Agora: rebuys e addons em colunas separadas.
-- ============================================

ALTER TABLE ranking_etapas
  RENAME COLUMN rebuys_addons TO rebuys;

ALTER TABLE ranking_etapas
  ADD COLUMN IF NOT EXISTS addons INTEGER NOT NULL DEFAULT 0;
