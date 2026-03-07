-- ============================================
-- LIVEBR - Migration 002: Create New Tables
-- ============================================
-- Baseado na seção 3 do LIVEBR_TECHNICAL_SPEC.md
-- ============================================

-- ============================================
-- 3.8 Tabela: users
-- ============================================
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('CODE', 'ADMIN', 'USER')),
  is_active  BOOLEAN NOT NULL DEFAULT true
);

-- ============================================
-- 3.2 Tabela: players
-- ============================================
CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id     TEXT NOT NULL UNIQUE,    -- ID numérico do PPPoker
  nick        TEXT NOT NULL,           -- apelido no app
  name        TEXT NOT NULL,           -- nome real
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT
);

-- ============================================
-- 3.5 Tabela: banks
-- ============================================
CREATE TABLE banks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  name            TEXT NOT NULL UNIQUE,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,  -- saldo no momento zero (ajuste inicial)
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ============================================
-- 3.1 Tabela: transactions (CENTRAL)
-- ============================================
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  date            DATE NOT NULL,                          -- data real da transação
  operation_type  TEXT,                                   -- ver enum abaixo (nullable para LOG pendente)
  type            TEXT NOT NULL CHECK (type IN ('LOG', 'FINANCIAL', 'CONTROL')),
  competencia     TEXT,                                   -- ex: 'SEM1 JAN/2026'
  chips           NUMERIC(12,2),                          -- valor em fichas (quando aplicável)
  value           NUMERIC(12,2),                          -- valor em R$ real (com taxa ChipPix já aplicada)
  is_debt         BOOLEAN NOT NULL DEFAULT false,         -- true = crédito/dívida
  origem          TEXT CHECK (origem IN ('MANUAL', 'CHIPPIX')), -- origem da movimentação
  club            TEXT CHECK (club IN ('ADM', 'PPOKER', 'SUPREMA')),
  player_id       UUID REFERENCES players(id),
  bank_id         UUID REFERENCES banks(id),
  acordo_id       UUID,                                   -- liga ACORDO_COLETA ↔ ACORDO_PAGAMENTO
  modality        TEXT,                                   -- PIX, TED, DINHEIRO, etc.
  has_receipt     BOOLEAN DEFAULT false,
  verified        BOOLEAN DEFAULT false,                  -- controle visual do operador (sem efeito em saldos)
  reconciled      BOOLEAN NOT NULL DEFAULT false,         -- true = conciliado (tipo definido)
  notes           TEXT,
  created_by      UUID REFERENCES users(id) NOT NULL,

  -- Constraint para validar operation_type
  CONSTRAINT valid_operation_type CHECK (
    operation_type IS NULL OR operation_type IN (
      'COMPRA_FICHAS',
      'CREDITO_FICHAS',
      'SAQUE_FICHAS',
      'CREDITO_PAGAMENTO_DINHEIRO',
      'CREDITO_PAGAMENTO_FICHAS',
      'CUSTO_DESPESA',
      'DEPOSITO_AVULSO',
      'SAQUE_AVULSO',
      'ACORDO_COLETA',
      'ACORDO_PAGAMENTO',
      'RANKING_COLETA',
      'RANKING_PAGAMENTO_FICHAS',
      'RANKING_PAGAMENTO_DINHEIRO',
      'CASHBACK_DINHEIRO',
      'CASHBACK_FICHAS',
      'CASHBACK_PAGAMENTO_DIVIDA',
      'RAKE',
      'RAKE_AGENTE',
      'AJUSTE_INICIAL'
    )
  )
);

-- ============================================
-- 3.3 Tabela: agents
-- ============================================
CREATE TABLE agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  player_id    UUID NOT NULL REFERENCES players(id),
  pct_rakeback NUMERIC(5,2) NOT NULL,   -- % do rake que vai para o agente (ex: 30.00)
  pct_lpbr     NUMERIC(5,2) NOT NULL,   -- % do rake que fica no clube (ex: 70.00)
  pct_suprema  NUMERIC(5,2),            -- % referente à Suprema (se aplicável)
  is_active    BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pct_sum CHECK (pct_rakeback + pct_lpbr = 100)
);

-- ============================================
-- 3.4 Tabela: agent_folders (Pastas de Agentes)
-- ============================================
CREATE TABLE agent_folders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_id     UUID NOT NULL REFERENCES agents(id),
  player_id    UUID NOT NULL REFERENCES players(id),
  platform     TEXT NOT NULL CHECK (platform IN ('PPOKER', 'SUPREMA')),
  pct_rakeback NUMERIC(5,2),   -- override do % por jogador específico (nullable = usa o do agente)
  pct_lpbr     NUMERIC(5,2),   -- override do % por jogador específico
  since        DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(agent_id, player_id, platform)
);

-- ============================================
-- 3.6 Tabela: ranking_transactions
-- ============================================
CREATE TABLE ranking_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  date            DATE NOT NULL,
  player_id       UUID NOT NULL REFERENCES players(id),
  type            TEXT NOT NULL CHECK (type IN ('COLETA', 'PAGAMENTO')),
  chips           NUMERIC(12,2) NOT NULL,
  total_prize     NUMERIC(12,2),          -- premiação total (para coleta)
  pct_collected   NUMERIC(5,2),           -- % aplicado na coleta
  payment_method  TEXT CHECK (payment_method IN ('DINHEIRO', 'FICHAS', 'ABATE_DIVIDA')),
  bank_id         UUID REFERENCES banks(id),
  transaction_id  UUID REFERENCES transactions(id),  -- referência na tabela central
  competencia     TEXT,
  notes           TEXT
);

-- ============================================
-- 3.7 Tabela: costs
-- ============================================
CREATE TABLE costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  category    TEXT,    -- 'SALARIO', 'TARIFA', 'CONTABILIDADE', etc.
  value       NUMERIC(12,2) NOT NULL,
  bank_id     UUID NOT NULL REFERENCES banks(id),
  competencia TEXT,
  transaction_id UUID REFERENCES transactions(id)
);

-- ============================================
-- 3.9 Tabela: audit_log
-- ============================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,        -- descrição da ação
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_value   JSONB,
  new_value   JSONB
);
