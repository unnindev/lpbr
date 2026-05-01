-- ============================================
-- LIVEBR - Migration 011: RAKE_SUPREMA
-- ============================================
-- Adiciona o operation_type RAKE_SUPREMA para
-- separar entradas de dinheiro vindas da Suprema
-- (que hoje entram como DEPOSITO_AVULSO).
-- ============================================

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
    'AJUSTE_RANKING'::text,
    'RAKE_SUPREMA'::text
  ]))
);
