-- ============================================
-- LIVEBR - Migration 003: Migrate Players
-- ============================================
-- Este script migra os jogadores do sistema antigo para o novo.
--
-- IMPORTANTE: Execute este script ANTES de dropar as tabelas antigas,
-- ou use os dados do backup CSV/JSON que você salvou.
-- ============================================

-- Opção A: Se as tabelas antigas ainda existirem, migrar direto
-- (Descomente e execute se for o caso)

/*
INSERT INTO players (id, created_at, club_id, nick, name, is_active, notes)
SELECT
  id,
  created_at,
  codigo_pppoker,
  nick_pppoker,
  nome,
  true,
  observacao
FROM jogadores;
*/

-- ============================================
-- Opção B: Inserir a partir do backup CSV
-- ============================================
-- Se você já dropou as tabelas antigas, use esta opção.
--
-- 1. No Supabase Dashboard, vá em Table Editor → players
-- 2. Clique em "Insert" → "Import from CSV"
-- 3. Faça upload do arquivo CSV
-- 4. Mapeie as colunas:
--    - id → id
--    - codigo_pppoker → club_id
--    - nick_pppoker → nick
--    - nome → name
--    - observacao → notes
--    - created_at → created_at
-- 5. Defina is_active = true para todas as linhas

-- ============================================
-- Opção C: Inserir via SQL (se tiver o JSON)
-- ============================================
-- Se você salvou como JSON, pode inserir assim:
-- (Substitua o JSON abaixo pelo conteúdo do seu backup)

/*
INSERT INTO players (id, created_at, club_id, nick, name, is_active, notes)
VALUES
  ('6051b93f-9da0-4a3d-a9cd-ae0a8116e343', '2026-01-01 19:19:03.086304+00', '3308116', 'SHIMADA99', 'Shimada', true, null),
  ('72838c9a-15a8-4eed-90b8-75635de3efe8', '2026-01-01 19:22:33.602084+00', '3528716', 'Rslama', 'Rômulo', true, null),
  -- ... adicione os demais jogadores aqui
;
*/

-- ============================================
-- Verificar migração
-- ============================================
-- Após migrar, execute para confirmar:
-- SELECT COUNT(*) FROM players;  -- Deve retornar 94
-- SELECT * FROM players LIMIT 5;
