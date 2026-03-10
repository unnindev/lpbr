-- ============================================
-- LIVEBR - Migration 009: Add AJUSTE_RANKING
-- ============================================
-- Adiciona o tipo AJUSTE_RANKING para separar
-- ajustes de ranking do cálculo de fichas em circulação
-- ============================================

-- 1. Atualizar a constraint para incluir AJUSTE_RANKING
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_operation_type;

ALTER TABLE transactions ADD CONSTRAINT valid_operation_type CHECK (
  (operation_type IS NULL) OR (operation_type = ANY (ARRAY[
    'COMPRA_FICHAS'::text,
    'CREDITO_FICHAS'::text,
    'SAQUE_FICHAS'::text,
    'CREDITO_PAGAMENTO_DINHEIRO'::text,
    'CREDITO_PAGAMENTO_FICHAS'::text,
    'CUSTO_DESPESA'::text,
    'DEPOSITO_AVULSO'::text,
    'SAQUE_AVULSO'::text,
    'ACORDO_COLETA'::text,
    'ACORDO_PAGAMENTO'::text,
    'RANKING_COLETA'::text,
    'RANKING_PAGAMENTO_FICHAS'::text,
    'RANKING_PAGAMENTO_DINHEIRO'::text,
    'CASHBACK_DINHEIRO'::text,
    'CASHBACK_FICHAS'::text,
    'CASHBACK_PAGAMENTO_DIVIDA'::text,
    'RAKE'::text,
    'RAKE_AGENTE'::text,
    'AJUSTE_INICIAL'::text,
    'AJUSTE_RANKING'::text
  ]))
);

-- 2. Corrigir a transação de saldo de ranking
-- (essa transação específica foi identificada como ajuste de ranking, não de circulação)
UPDATE transactions
SET operation_type = 'AJUSTE_RANKING'
WHERE operation_type = 'AJUSTE_INICIAL'
  AND notes LIKE '%Saldo de ranking%';

-- 3. Atualizar a função get_saldo_ranking para incluir AJUSTE_RANKING
CREATE OR REPLACE FUNCTION get_saldo_ranking()
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT
      COALESCE(SUM(CASE WHEN operation_type = 'RANKING_COLETA' THEN chips ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN operation_type = 'AJUSTE_RANKING' THEN chips ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN operation_type = 'RANKING_PAGAMENTO_FICHAS' THEN chips ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN operation_type = 'RANKING_PAGAMENTO_DINHEIRO' THEN value ELSE 0 END), 0)
    FROM transactions
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Restaurar CASHBACK_PAGAMENTO_DIVIDA na função get_credito_concedido
CREATE OR REPLACE FUNCTION get_credito_concedido()
RETURNS NUMERIC AS $$
DECLARE
  v_credito_dado   NUMERIC;
  v_pago_fichas    NUMERIC;
  v_pago_dinheiro  NUMERIC;
  v_abatimentos    NUMERIC;
BEGIN
  -- Crédito dado
  SELECT COALESCE(SUM(chips), 0) INTO v_credito_dado
  FROM transactions
  WHERE operation_type = 'CREDITO_FICHAS';

  -- Pagamentos recebidos (fichas)
  SELECT COALESCE(SUM(chips), 0) INTO v_pago_fichas
  FROM transactions
  WHERE operation_type = 'CREDITO_PAGAMENTO_FICHAS';

  -- Pagamentos recebidos (dinheiro)
  SELECT COALESCE(SUM(value), 0) INTO v_pago_dinheiro
  FROM transactions
  WHERE operation_type = 'CREDITO_PAGAMENTO_DINHEIRO';

  -- Abatimentos via cashback (rakeback aplicado na dívida)
  SELECT COALESCE(SUM(value), 0) INTO v_abatimentos
  FROM transactions
  WHERE operation_type = 'CASHBACK_PAGAMENTO_DIVIDA';

  RETURN v_credito_dado - v_pago_fichas - v_pago_dinheiro - v_abatimentos;
END;
$$ LANGUAGE plpgsql;
