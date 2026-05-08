-- ============================================
-- LIVEBR - Migration 014: Rebuys / Add-ons
-- ============================================
-- Campo informativo (não afeta cálculos): número
-- de rebuys + add-ons que o jogador fez na etapa.
-- ============================================

ALTER TABLE ranking_classificacoes
  ADD COLUMN IF NOT EXISTS rebuys_addons INTEGER NOT NULL DEFAULT 0;
