-- ============================================
-- LIVEBR - Migration 017: CONTROLE_SUPREMA
-- ============================================
-- Tabela de controle MANUAL de saldos dos jogadores
-- na Suprema. Totalmente desvinculada do restante do
-- sistema (transactions, banks, etc): serve apenas para
-- registrar/somar números que atualizamos com o tempo.
--
-- Colunas:
--   saldo_devedor -> DEVEDOR     (saldo devedor acumulado)
--   saldo_semana  -> SEM ATUAL   (saldo da semana atual)
--   saldo_final   -> FINAL       (soma das duas, calculada)
--   updated_at    -> última alteração de CADA linha
-- ============================================

CREATE TABLE IF NOT EXISTS controle_suprema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  saldo_devedor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  saldo_semana NUMERIC(14, 2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(14, 2) GENERATED ALWAYS AS (saldo_devedor + saldo_semana) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Um jogador aparece no máximo uma vez nesta planilha
  CONSTRAINT controle_suprema_player_unique UNIQUE (player_id)
);

CREATE INDEX IF NOT EXISTS idx_controle_suprema_player ON controle_suprema (player_id);

-- ============================================
-- TRIGGER: atualiza updated_at em cada UPDATE
-- (para sabermos quando cada linha mudou pela última vez)
-- ============================================

CREATE OR REPLACE FUNCTION set_controle_suprema_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_controle_suprema_updated_at ON controle_suprema;
CREATE TRIGGER trg_controle_suprema_updated_at
  BEFORE UPDATE ON controle_suprema
  FOR EACH ROW
  EXECUTE FUNCTION set_controle_suprema_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- (mesmo padrão das demais tabelas: usuário autenticado
--  pode ler/escrever; escrita real acontece via Server Actions)
-- ============================================

ALTER TABLE controle_suprema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "controle_suprema_read" ON controle_suprema
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "controle_suprema_insert" ON controle_suprema
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "controle_suprema_update" ON controle_suprema
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "controle_suprema_delete" ON controle_suprema
  FOR DELETE USING (auth.uid() IS NOT NULL);
