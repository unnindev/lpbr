-- ============================================
-- LIVEBR - Migration 013: Add VIEWER role
-- ============================================
-- Novo role VIEWER: acesso somente-leitura ao
-- ranking (etapas, ranking geral, classificação)
-- ============================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('CODE', 'ADMIN', 'USER', 'VIEWER'));
