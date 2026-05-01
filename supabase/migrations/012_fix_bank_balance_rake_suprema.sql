-- ============================================
-- LIVEBR - Migration 012: Fix get_bank_balance for RAKE_SUPREMA
-- ============================================
-- RAKE_SUPREMA é uma entrada de dinheiro no banco.
-- Sem isso, o saldo do banco (e o saldo geral) ignorava o valor.
-- ============================================

CREATE OR REPLACE FUNCTION get_bank_balance(p_bank_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial  NUMERIC;
  v_entradas NUMERIC;
  v_saidas   NUMERIC;
BEGIN
  SELECT initial_balance INTO v_initial FROM banks WHERE id = p_bank_id;

  SELECT COALESCE(SUM(value), 0) INTO v_entradas
  FROM transactions
  WHERE bank_id = p_bank_id
    AND operation_type IN (
      'COMPRA_FICHAS',
      'CREDITO_PAGAMENTO_DINHEIRO',
      'DEPOSITO_AVULSO',
      'RAKE_SUPREMA'
    );

  SELECT COALESCE(SUM(value), 0) INTO v_saidas
  FROM transactions
  WHERE bank_id = p_bank_id
    AND operation_type IN (
      'SAQUE_FICHAS',
      'CUSTO_DESPESA',
      'SAQUE_AVULSO',
      'CASHBACK_DINHEIRO',
      'RANKING_PAGAMENTO_DINHEIRO'
    );

  RETURN COALESCE(v_initial, 0) + v_entradas - v_saidas;
END;
$$ LANGUAGE plpgsql;
