-- ============================================
-- LIVEBR - Migration 008: Fix Fichas Circulação
-- ============================================
-- Corrige a função get_fichas_circulacao
-- - Adiciona AJUSTE_INICIAL em aumentam (estava faltando)
-- - Move RAKE_AGENTE para aumentam (paga fichas ao agente = aumenta circulação)
-- - RAKE permanece em diminuem (taxa da plataforma = remove fichas)
-- ============================================

DROP FUNCTION IF EXISTS get_fichas_circulacao();

CREATE OR REPLACE FUNCTION get_fichas_circulacao()
RETURNS NUMERIC AS $$
DECLARE
  v_aumentam NUMERIC;
  v_diminuem NUMERIC;
BEGIN
  -- Fichas que AUMENTAM circulação (fichas enviadas para jogadores/agentes)
  SELECT COALESCE(SUM(chips), 0) INTO v_aumentam
  FROM transactions
  WHERE operation_type IN (
    'COMPRA_FICHAS',
    'CREDITO_FICHAS',
    'CASHBACK_FICHAS',
    'RANKING_PAGAMENTO_FICHAS',
    'ACORDO_PAGAMENTO',
    'AJUSTE_INICIAL',
    'RAKE_AGENTE'
  );

  -- Fichas que DIMINUEM circulação (fichas devolvidas/removidas)
  SELECT COALESCE(SUM(chips), 0) INTO v_diminuem
  FROM transactions
  WHERE operation_type IN (
    'SAQUE_FICHAS',
    'CREDITO_PAGAMENTO_FICHAS',
    'RANKING_COLETA',
    'ACORDO_COLETA',
    'RAKE'
  );

  RETURN v_aumentam - v_diminuem;
END;
$$ LANGUAGE plpgsql;
