-- ============================================
-- LIVEBR - Migration 010: Ranking Classificação
-- ============================================
-- Estrutura para gerenciar etapas, classificações e
-- pontuação do ranking, com tabelas de pontos e premiação
-- versionadas e configuráveis.
-- ============================================

-- ============================================
-- 1. system_config (key/value para configs simples)
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO system_config (key, value)
VALUES ('default_coleta_percentual', '8')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 2. ranking_pontos_versoes / ranking_pontos_itens
-- ============================================
CREATE TABLE ranking_pontos_versoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  label      TEXT NOT NULL,
  ativa      BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_ranking_pontos_versoes_ativa
  ON ranking_pontos_versoes (ativa) WHERE ativa = true;

CREATE TABLE ranking_pontos_itens (
  versao_id UUID NOT NULL REFERENCES ranking_pontos_versoes(id) ON DELETE CASCADE,
  posicao   INTEGER NOT NULL CHECK (posicao BETWEEN 1 AND 20),
  pontos    NUMERIC(8,2) NOT NULL,
  PRIMARY KEY (versao_id, posicao)
);

-- ============================================
-- 3. ranking_premiacao_versoes / ranking_premiacao_itens
-- ============================================
CREATE TABLE ranking_premiacao_versoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  label      TEXT NOT NULL,
  ativa      BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_ranking_premiacao_versoes_ativa
  ON ranking_premiacao_versoes (ativa) WHERE ativa = true;

CREATE TABLE ranking_premiacao_itens (
  versao_id   UUID NOT NULL REFERENCES ranking_premiacao_versoes(id) ON DELETE CASCADE,
  posicao     INTEGER NOT NULL CHECK (posicao >= 1),
  percentual  NUMERIC(6,3) NOT NULL CHECK (percentual >= 0),
  PRIMARY KEY (versao_id, posicao)
);

-- ============================================
-- 4. ranking_etapas
-- ============================================
CREATE TABLE ranking_etapas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome                TEXT NOT NULL,
  data_realizada      DATE NOT NULL,
  mes_referencia      DATE NOT NULL,           -- primeiro dia do mês de ranking (ex: 2026-04-01)
  pontos_versao_id    UUID REFERENCES ranking_pontos_versoes(id),
  percentual_coleta   NUMERIC(5,2) NOT NULL DEFAULT 8,
  created_by          UUID REFERENCES users(id)
);

CREATE INDEX idx_ranking_etapas_mes_ref ON ranking_etapas(mes_referencia);
CREATE INDEX idx_ranking_etapas_data ON ranking_etapas(data_realizada);

-- ============================================
-- 5. ranking_classificacoes
-- ============================================
CREATE TABLE ranking_classificacoes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  etapa_id               UUID NOT NULL REFERENCES ranking_etapas(id) ON DELETE CASCADE,
  player_id              UUID NOT NULL REFERENCES players(id),
  posicao                INTEGER NOT NULL CHECK (posicao >= 1),
  pontos_snapshot        NUMERIC(8,2) NOT NULL DEFAULT 0,
  foi_premiado           BOOLEAN NOT NULL DEFAULT false,
  premio_chips           NUMERIC(12,2),
  coleta_transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  UNIQUE (etapa_id, player_id),
  UNIQUE (etapa_id, posicao)
);

CREATE INDEX idx_ranking_classificacoes_player ON ranking_classificacoes(player_id);
CREATE INDEX idx_ranking_classificacoes_etapa ON ranking_classificacoes(etapa_id);

-- ============================================
-- 6. transactions: liga RANKING_COLETA à etapa
-- ============================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS ranking_etapa_id UUID REFERENCES ranking_etapas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_ranking_etapa
  ON transactions(ranking_etapa_id);

-- ============================================
-- 7. RLS (auth.uid() IS NOT NULL)
-- ============================================
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_pontos_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_pontos_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_premiacao_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_premiacao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_classificacoes ENABLE ROW LEVEL SECURITY;

-- Read
CREATE POLICY "system_config_read" ON system_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_versoes_read" ON ranking_pontos_versoes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_itens_read" ON ranking_pontos_itens FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_versoes_read" ON ranking_premiacao_versoes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_itens_read" ON ranking_premiacao_itens FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_etapas_read" ON ranking_etapas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_classificacoes_read" ON ranking_classificacoes FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert
CREATE POLICY "system_config_insert" ON system_config FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_versoes_insert" ON ranking_pontos_versoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_itens_insert" ON ranking_pontos_itens FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_versoes_insert" ON ranking_premiacao_versoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_itens_insert" ON ranking_premiacao_itens FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_etapas_insert" ON ranking_etapas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_classificacoes_insert" ON ranking_classificacoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update
CREATE POLICY "system_config_update" ON system_config FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_versoes_update" ON ranking_pontos_versoes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_itens_update" ON ranking_pontos_itens FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_versoes_update" ON ranking_premiacao_versoes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_itens_update" ON ranking_premiacao_itens FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_etapas_update" ON ranking_etapas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_classificacoes_update" ON ranking_classificacoes FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Delete
CREATE POLICY "ranking_pontos_versoes_delete" ON ranking_pontos_versoes FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_pontos_itens_delete" ON ranking_pontos_itens FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_versoes_delete" ON ranking_premiacao_versoes FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_premiacao_itens_delete" ON ranking_premiacao_itens FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_etapas_delete" ON ranking_etapas FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ranking_classificacoes_delete" ON ranking_classificacoes FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- 8. Migração retroativa: cria uma etapa por dia
--    de RANKING_COLETA já existente e linka.
-- ============================================
DO $$
DECLARE
  v_date          DATE;
  v_etapa_id      UUID;
  v_default_user  UUID;
BEGIN
  v_default_user := (SELECT id FROM users WHERE role = 'CODE' LIMIT 1);

  FOR v_date IN
    SELECT DISTINCT date
    FROM transactions
    WHERE operation_type = 'RANKING_COLETA'
      AND ranking_etapa_id IS NULL
    ORDER BY date
  LOOP
    INSERT INTO ranking_etapas (nome, data_realizada, mes_referencia, percentual_coleta, created_by)
    VALUES (
      'Etapa migrada — ' || to_char(v_date, 'DD/MM/YYYY'),
      v_date,
      date_trunc('month', v_date)::date,
      8,
      v_default_user
    )
    RETURNING id INTO v_etapa_id;

    UPDATE transactions
    SET ranking_etapa_id = v_etapa_id
    WHERE operation_type = 'RANKING_COLETA'
      AND date = v_date
      AND ranking_etapa_id IS NULL;
  END LOOP;
END $$;
