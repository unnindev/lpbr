-- ============================================
-- LIVEBR - Migration 005: Create Functions
-- ============================================
-- Funções SQL para cálculos financeiros
-- Baseado na seção 4 do LIVEBR_TECHNICAL_SPEC.md
-- ============================================

-- ============================================
-- 4.1 Fichas em Circulação
-- ============================================
CREATE OR REPLACE FUNCTION get_fichas_circulacao()
RETURNS NUMERIC AS $$
DECLARE
  v_aumentam NUMERIC;
  v_diminuem NUMERIC;
BEGIN
  -- Fichas que AUMENTAM circulação
  SELECT COALESCE(SUM(chips), 0) INTO v_aumentam
  FROM transactions
  WHERE operation_type IN (
    'COMPRA_FICHAS',
    'CREDITO_FICHAS',
    'CASHBACK_FICHAS',
    'RANKING_PAGAMENTO_FICHAS',
    'ACORDO_PAGAMENTO'
  );

  -- Fichas que DIMINUEM circulação
  SELECT COALESCE(SUM(chips), 0) INTO v_diminuem
  FROM transactions
  WHERE operation_type IN (
    'SAQUE_FICHAS',
    'CREDITO_PAGAMENTO_FICHAS',
    'RANKING_COLETA',
    'ACORDO_COLETA',
    'RAKE',
    'RAKE_AGENTE'
  );

  RETURN v_aumentam - v_diminuem;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.2 Saldo por Banco
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
      'DEPOSITO_AVULSO'
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

-- ============================================
-- 4.3 Crédito Concedido (Dívidas Abertas)
-- ============================================
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

  -- Abatimentos via cashback
  SELECT COALESCE(SUM(value), 0) INTO v_abatimentos
  FROM transactions
  WHERE operation_type = 'CASHBACK_PAGAMENTO_DIVIDA';

  RETURN v_credito_dado - v_pago_fichas - v_pago_dinheiro - v_abatimentos;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.4 Saldo Ranking
-- ============================================
CREATE OR REPLACE FUNCTION get_saldo_ranking()
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT
      COALESCE(SUM(CASE WHEN operation_type = 'RANKING_COLETA' THEN chips ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN operation_type = 'RANKING_PAGAMENTO_FICHAS' THEN chips ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN operation_type = 'RANKING_PAGAMENTO_DINHEIRO' THEN value ELSE 0 END), 0)
    FROM transactions
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.5 Total Bancos
-- ============================================
CREATE OR REPLACE FUNCTION get_total_bancos()
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(get_bank_balance(id)), 0)
    FROM banks
    WHERE is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.5 Saldo Geral (função principal)
-- ============================================
CREATE OR REPLACE FUNCTION get_saldo_geral()
RETURNS JSONB AS $$
DECLARE
  v_total_bancos     NUMERIC;
  v_credito          NUMERIC;
  v_fichas           NUMERIC;
  v_ranking          NUMERIC;
BEGIN
  -- Total bancos
  v_total_bancos := get_total_bancos();

  -- Crédito concedido (dívidas abertas)
  v_credito := get_credito_concedido();

  -- Fichas em circulação
  v_fichas := get_fichas_circulacao();

  -- Saldo ranking
  v_ranking := get_saldo_ranking();

  RETURN jsonb_build_object(
    'total_bancos', v_total_bancos,
    'credito_concedido', v_credito,
    'fichas_circulacao', v_fichas,
    'saldo_ranking', v_ranking,
    'saldo_geral', v_total_bancos + v_credito - v_fichas - v_ranking
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.6 Resultado Financeiro Mensal
-- ============================================
CREATE OR REPLACE FUNCTION get_resultado_mensal(p_mes DATE)
RETURNS JSONB AS $$
DECLARE
  v_rake             NUMERIC;
  v_ranking_coletas  NUMERIC;
  v_custos           NUMERIC;
  v_ranking_premios  NUMERIC;
  v_cashback         NUMERIC;
  v_total_receitas   NUMERIC;
  v_total_despesas   NUMERIC;
BEGIN
  -- Receitas do mês
  SELECT
    COALESCE(SUM(CASE WHEN operation_type = 'RAKE' THEN chips ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type = 'RANKING_COLETA' THEN chips ELSE 0 END), 0)
  INTO v_rake, v_ranking_coletas
  FROM transactions
  WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', p_mes);

  -- Despesas do mês
  SELECT
    COALESCE(SUM(CASE WHEN operation_type = 'CUSTO_DESPESA' THEN value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type IN ('RANKING_PAGAMENTO_FICHAS', 'RANKING_PAGAMENTO_DINHEIRO') THEN COALESCE(chips, value) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type IN ('CASHBACK_DINHEIRO', 'CASHBACK_FICHAS') THEN COALESCE(value, chips) ELSE 0 END), 0)
  INTO v_custos, v_ranking_premios, v_cashback
  FROM transactions
  WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', p_mes);

  v_total_receitas := v_rake + v_ranking_coletas;
  v_total_despesas := v_custos + v_ranking_premios + v_cashback;

  RETURN jsonb_build_object(
    'mes', to_char(p_mes, 'YYYY-MM'),
    'rake', v_rake,
    'ranking_coletas', v_ranking_coletas,
    'total_receitas', v_total_receitas,
    'custos_operacionais', v_custos,
    'ranking_premios', v_ranking_premios,
    'cashback_agentes', v_cashback,
    'total_despesas', v_total_despesas,
    'resultado', v_total_receitas - v_total_despesas
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.8 Resultado por Jogador
-- ============================================
CREATE OR REPLACE FUNCTION get_resultado_jogador(p_player_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_compras  NUMERIC;
  v_total_saques   NUMERIC;
  v_total_cashback NUMERIC;
  v_divida_atual   NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN operation_type IN ('COMPRA_FICHAS', 'CREDITO_FICHAS') THEN chips ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type = 'SAQUE_FICHAS' THEN chips ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type IN ('CASHBACK_DINHEIRO', 'CASHBACK_FICHAS') THEN COALESCE(value, chips) ELSE 0 END), 0)
  INTO v_total_compras, v_total_saques, v_total_cashback
  FROM transactions
  WHERE player_id = p_player_id;

  -- Dívida atual do jogador
  SELECT
    COALESCE(SUM(CASE WHEN operation_type = 'CREDITO_FICHAS' THEN chips ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN operation_type = 'CREDITO_PAGAMENTO_FICHAS' THEN chips ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN operation_type = 'CREDITO_PAGAMENTO_DINHEIRO' THEN value ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN operation_type = 'CASHBACK_PAGAMENTO_DIVIDA' THEN value ELSE 0 END), 0)
  INTO v_divida_atual
  FROM transactions
  WHERE player_id = p_player_id;

  RETURN jsonb_build_object(
    'player_id', p_player_id,
    'total_compras', v_total_compras,
    'total_saques', v_total_saques,
    'total_cashback', v_total_cashback,
    'divida_atual', v_divida_atual,
    'resultado', v_total_saques - v_total_compras  -- positivo = ganhando, negativo = perdendo
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Função auxiliar: Jogadores com dívida
-- ============================================
CREATE OR REPLACE FUNCTION get_jogadores_com_divida()
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  nick TEXT,
  divida_atual NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.nick,
    COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_FICHAS' THEN t.chips ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_PAGAMENTO_FICHAS' THEN t.chips ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_PAGAMENTO_DINHEIRO' THEN t.value ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.operation_type = 'CASHBACK_PAGAMENTO_DIVIDA' THEN t.value ELSE 0 END), 0)
    AS divida
  FROM players p
  LEFT JOIN transactions t ON t.player_id = p.id
  GROUP BY p.id, p.name, p.nick
  HAVING (
    COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_FICHAS' THEN t.chips ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_PAGAMENTO_FICHAS' THEN t.chips ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_PAGAMENTO_DINHEIRO' THEN t.value ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.operation_type = 'CASHBACK_PAGAMENTO_DIVIDA' THEN t.value ELSE 0 END), 0)
  ) > 0
  ORDER BY divida DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Função auxiliar: Saldo de todos os bancos
-- ============================================
CREATE OR REPLACE FUNCTION get_all_bank_balances()
RETURNS TABLE (
  bank_id UUID,
  bank_name TEXT,
  saldo NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    get_bank_balance(b.id)
  FROM banks b
  WHERE b.is_active = true
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;
