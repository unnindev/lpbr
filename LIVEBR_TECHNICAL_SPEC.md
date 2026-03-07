# LIVEBR — Especificação Técnica Completa para Desenvolvimento
**Versão:** 1.0  
**Data:** Março 2026  
**Stack:** Next.js 14+ (App Router) + Supabase (PostgreSQL)  
**Destinatário:** Claude Code

---

## INSTRUÇÕES GERAIS PARA O CLAUDE CODE

Este documento é a fonte única de verdade para o sistema LIVEBR. Antes de implementar qualquer feature, leia a seção correspondente por completo — especialmente as regras de cálculo. Os valores financeiros devem ser 100% corretos. Qualquer dúvida, priorize a lógica descrita aqui sobre qualquer inferência própria.

**Princípios de desenvolvimento:**
- TypeScript estrito em tudo
- Nunca arredondar valores intermediários — arredondar apenas no display (2 casas decimais)
- Toda operação que afeta saldo deve passar por uma única função de cálculo centralizada
- Nenhum valor financeiro calculado no frontend — sempre buscar do banco ou de Server Actions
- RLS (Row Level Security) ativo em todas as tabelas

---

## 1. VISÃO GERAL DO NEGÓCIO

O sistema gerencia um clube de poker online operado no **PPPoker**. Cada ficha no PPPoker equivale a **R$ 1,00** no mundo real.

O clube intermedia a compra e venda de fichas entre os jogadores e o aplicativo. Todo dinheiro real fica nas contas bancárias do clube. Todo dinheiro virtual (fichas) fica no PPPoker.

**Aplicativos externos envolvidos:**
- **PPPoker:** plataforma principal. O clube é dono da sala e gerencia fichas, rake, agentes e jogadores.
- **Suprema:** plataforma secundária onde o clube atua apenas como agente externo, recebendo comissão dos jogadores lá cadastrados.
- **ChipPix:** ferramenta de automação de pagamentos. Processa depósitos e saques automaticamente, cobrando R$0,50 por transação. Sem integração via API — tudo registrado manualmente no sistema.

---

## 2. REGRAS DE NEGÓCIO FUNDAMENTAIS

### 2.1 Fichas em Circulação

Representa quantas fichas estão nas mãos dos jogadores no PPPoker neste momento.

```
Fichas em Circulação = Σ(ENVIADAS) - Σ(RECEBIDAS) - Σ(RAKE) - Σ(RANKING_COLETA) + Σ(RANKING_PAGAMENTO_FICHAS) + Σ(ACORDO_PAGAMENTO) - Σ(ACORDO_COLETA) + Σ(CASHBACK_FICHAS) + Σ(CREDITO_FICHAS) - Σ(CREDITO_PAGAMENTO_FICHAS)
```

**Regra crítica:** ao final de cada dia, o total de fichas em circulação calculado pelo sistema DEVE ser igual ao total exibido no app PPPoker. Se divergir, há erro de lançamento.

### 2.2 Saldo por Banco

```
Saldo Banco[X] = saldo_inicial[X]
  + Σ(transactions WHERE bank_id = X AND operation_type IN (
      'COMPRA_FICHAS',
      'CREDITO_PAGAMENTO_DINHEIRO',
      'DEPOSITO_AVULSO',
      'RANKING_PAGAMENTO_DINHEIRO' -- sinal negativo: saída
    ) AND type = 'FINANCIAL')
  - Σ(transactions WHERE bank_id = X AND operation_type IN (
      'SAQUE_FICHAS',
      'CUSTO_DESPESA',
      'SAQUE_AVULSO',
      'CASHBACK_DINHEIRO',
      'RANKING_PAGAMENTO_DINHEIRO'
    ))
```

> **ChipPix — Regra de ouro:**  
> Quando `origem = 'CHIPPIX'`, o valor em reais registrado no banco NÃO é igual ao valor em fichas:
> - **Depósito (jogador compra fichas):** jogador recebe X fichas, mas conta ChipPix recebe apenas **(X − 0,50)**
> - **Saque (jogador saca fichas):** jogador entrega X fichas, mas conta ChipPix paga **(X + 0,50)**
>
> O campo `value` na tabela `transactions` deve sempre armazenar o **valor real em reais** (já com o desconto/acréscimo da taxa). O campo `chips` armazena o valor em fichas do jogador. O sistema calcula `value` automaticamente a partir de `chips` quando `origem = 'CHIPPIX'`.

### 2.3 Crédito / Dívida

Quando um jogador recebe fichas sem pagar:
- As fichas são enviadas normalmente (sobem a circulação)
- Não há entrada bancária
- Uma dívida é registrada (`is_debt = true`)
- A dívida é ativo do clube (o clube tem a receber)
- Quitada quando o jogador paga em dinheiro (`CREDITO_PAGAMENTO_DINHEIRO`) ou devolve fichas (`CREDITO_PAGAMENTO_FICHAS`)

```
Total Crédito Concedido = Σ(value WHERE is_debt = true AND quitado = false)
```

### 2.4 Rake

Rake é a taxa retirada dos jogadores durante o jogo. É receita do clube.
- Registrado diariamente (um lançamento por dia)
- **Diminui as fichas em circulação** (as fichas saem do pool de jogadores)
- **Não entra no saldo bancário** — é receita contábil, não movimentação de caixa
- Acumulado mensalmente para cálculo de resultado

### 2.5 Acordo entre Jogadores

Quando jogador A transfere fichas para jogador B diretamente no PPPoker:
- O clube registra dois lançamentos **independentes** vinculados por `acordo_id`
- `ACORDO_COLETA`: fichas saem de A → **↓ circulação no dia do registro**
- `ACORDO_PAGAMENTO`: fichas vão para B → **↑ circulação no dia do registro**
- Os dois podem ocorrer em **dias diferentes**
- Não há movimentação bancária
- Cada lançamento impacta o saldo do dia em que é registrado

### 2.6 Pool de Ranking

Fichas coletadas para o ranking saem da circulação normal e entram num pool separado.

```
Saldo Ranking = Σ(RANKING_COLETA) - Σ(RANKING_PAGAMENTO_FICHAS) - Σ(RANKING_PAGAMENTO_DINHEIRO)
```

- **Coleta:** percentual (normalmente 8–10%) sobre a premiação do jogador
- **Pagamento em fichas:** fichas saem do pool e voltam à circulação normal
- **Pagamento em dinheiro:** dinheiro sai do banco, pool diminui em valor

### 2.7 Saldo Geral do Clube

```
Saldo Geral = Total Bancos + Crédito Concedido - Fichas em Circulação - Saldo Ranking
```

- **Total Bancos:** soma dos saldos de todas as contas ativas
- **Crédito Concedido:** dívidas abertas de jogadores (ativo a receber)
- **Fichas em Circulação:** subtraído porque representa dinheiro "deployado" em fichas (obrigação futura de sacar)
- **Saldo Ranking:** subtraído porque são fichas custodiadas com obrigação futura de devolver

### 2.8 Rakeback de Agentes

Agentes recebem percentual do rake gerado pelos jogadores da sua pasta. Pagamento semanal.

```
Rakeback Agente[semana] = Valor Rake da Semana × pct_rakeback
Parte LPBR[semana] = Valor Rake da Semana × pct_lpbr
```

O funcionário informa o valor bruto de rake por agente (vindo do PPPoker). O sistema calcula automaticamente o valor a pagar (Rakeback) e o que fica no clube (LPBR).

---

## 3. MODELO DE DADOS (SUPABASE / POSTGRESQL)

### 3.1 Tabela: `transactions` (CENTRAL)

Esta é a tabela mais importante do sistema. Toda movimentação — de fichas, financeira ou de controle — é um registro aqui.

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  date            DATE NOT NULL,                          -- data real da transação
  operation_type  TEXT NOT NULL,                          -- ver enum abaixo
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
  created_by      UUID REFERENCES users(id) NOT NULL
);
```

**Enum `operation_type` — valores válidos:**

| Valor | type | Efeito Fichas | Efeito Banco | Efeito Dívida | Efeito Ranking |
|-------|------|:---:|:---:|:---:|:---:|
| `COMPRA_FICHAS` | LOG | ↑ chips | ↑ bank (value) | — | — |
| `CREDITO_FICHAS` | LOG | ↑ chips | — | ↑ dívida | — |
| `SAQUE_FICHAS` | LOG | ↓ chips | ↓ bank (value) | — | — |
| `CREDITO_PAGAMENTO_DINHEIRO` | FINANCIAL | — | ↑ bank (value) | ↓ dívida | — |
| `CREDITO_PAGAMENTO_FICHAS` | LOG | ↓ chips | — | ↓ dívida | — |
| `CUSTO_DESPESA` | FINANCIAL | — | ↓ bank (value) | — | — |
| `DEPOSITO_AVULSO` | FINANCIAL | — | ↑ bank (value) | — | — |
| `SAQUE_AVULSO` | FINANCIAL | — | ↓ bank (value) | — | — |
| `ACORDO_COLETA` | LOG | ↓ chips | — | — | — |
| `ACORDO_PAGAMENTO` | LOG | ↑ chips | — | — | — |
| `RANKING_COLETA` | LOG | ↓ chips | — | — | ↑ ranking |
| `RANKING_PAGAMENTO_FICHAS` | LOG | ↑ chips | — | — | ↓ ranking |
| `RANKING_PAGAMENTO_DINHEIRO` | FINANCIAL | — | ↓ bank (value) | — | ↓ ranking |
| `CASHBACK_DINHEIRO` | FINANCIAL | — | ↓ bank (value) | — | — |
| `CASHBACK_FICHAS` | LOG | ↑ chips | — | — | — |
| `CASHBACK_PAGAMENTO_DIVIDA` | CONTROL | — | — | ↓ dívida | — |
| `RAKE` | LOG | ↓ chips | — | — | — |
| `RAKE_AGENTE` | LOG | ↓ chips | — | — | — |
| `AJUSTE_INICIAL` | CONTROL | varia | varia | — | varia |

**Índices obrigatórios:**

```sql
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_player ON transactions(player_id);
CREATE INDEX idx_transactions_bank ON transactions(bank_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_operation ON transactions(operation_type);
CREATE INDEX idx_transactions_reconciled ON transactions(reconciled);
CREATE INDEX idx_transactions_acordo ON transactions(acordo_id);
CREATE INDEX idx_transactions_competencia ON transactions(competencia);
```

---

### 3.2 Tabela: `players`

```sql
CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id     TEXT NOT NULL UNIQUE,    -- ID numérico do PPPoker
  nick        TEXT NOT NULL,           -- apelido no app
  name        TEXT NOT NULL,           -- nome real
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT
);

CREATE INDEX idx_players_nick ON players(nick);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_club_id ON players(club_id);
```

---

### 3.3 Tabela: `agents`

```sql
CREATE TABLE agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  player_id    UUID NOT NULL REFERENCES players(id),
  pct_rakeback NUMERIC(5,2) NOT NULL,   -- % do rake que vai para o agente (ex: 30.00)
  pct_lpbr     NUMERIC(5,2) NOT NULL,   -- % do rake que fica no clube (ex: 70.00)
  -- CONSTRAINT: pct_rakeback + pct_lpbr = 100
  pct_suprema  NUMERIC(5,2),            -- % referente à Suprema (se aplicável)
  is_active    BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pct_sum CHECK (pct_rakeback + pct_lpbr = 100)
);
```

---

### 3.4 Tabela: `agent_folders` (Pastas de Agentes)

```sql
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
```

---

### 3.5 Tabela: `banks`

```sql
CREATE TABLE banks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  name            TEXT NOT NULL UNIQUE,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,  -- saldo no momento zero (ajuste inicial)
  is_active       BOOLEAN NOT NULL DEFAULT true
);
```

---

### 3.6 Tabela: `ranking_transactions`

Tabela auxiliar para rastrear coletas e pagamentos do ranking com detalhes extras.

```sql
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
```

---

### 3.7 Tabela: `costs`

```sql
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
```

---

### 3.8 Tabela: `users`

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('CODE', 'ADMIN', 'USER')),
  is_active  BOOLEAN NOT NULL DEFAULT true
);
```

**Permissões por role:**

| Módulo | CODE | ADMIN | USER |
|--------|:----:|:-----:|:----:|
| Ajuste Inicial | ✅ | ❌ | ❌ |
| LOG | ✅ | ✅ | ✅ |
| Conciliação | ✅ | ✅ | ✅ |
| Rake | ✅ | ✅ | ❌ |
| Ranking | ✅ | ✅ | ✅ |
| Agentes | ✅ | ✅ | ❌ |
| Rake Semanal | ✅ | ✅ | ✅ |
| Jogadores (lista) | ✅ | ✅ | consulta |
| Jogadores (consulta detalhada) | ✅ | ✅ | ❌ |
| Crédito | ✅ | ✅ | ❌ |
| Financeiro | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ❌ |
| Histórico | ✅ | ✅ | ❌ |
| Usuários | ✅ | ❌ | ❌ |

---

### 3.9 Tabela: `audit_log`

```sql
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

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## 4. FÓRMULAS E CÁLCULOS — IMPLEMENTAÇÃO

> **ATENÇÃO:** Todas as queries de cálculo devem ser feitas no banco (Supabase RPC / PostgreSQL functions) ou em Server Actions. Nunca calcular saldos no cliente.

### 4.1 Fichas em Circulação

```sql
-- Fichas que AUMENTAM circulação
SELECT COALESCE(SUM(chips), 0) FROM transactions
WHERE operation_type IN (
  'COMPRA_FICHAS',
  'CREDITO_FICHAS',
  'CASHBACK_FICHAS',
  'RANKING_PAGAMENTO_FICHAS',
  'ACORDO_PAGAMENTO'
)

-- Fichas que DIMINUEM circulação
SELECT COALESCE(SUM(chips), 0) FROM transactions
WHERE operation_type IN (
  'SAQUE_FICHAS',
  'CREDITO_PAGAMENTO_FICHAS',
  'RANKING_COLETA',
  'ACORDO_COLETA',
  'RAKE',
  'RAKE_AGENTE'
)

-- Resultado
fichas_circulacao = SUM(aumentam) - SUM(diminuem)
```

### 4.2 Saldo por Banco

```sql
CREATE OR REPLACE FUNCTION get_bank_balance(p_bank_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial    NUMERIC;
  v_entradas   NUMERIC;
  v_saidas     NUMERIC;
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

  RETURN v_initial + v_entradas - v_saidas;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 Crédito Concedido (Dívidas Abertas)

```sql
-- Crédito dado
SELECT COALESCE(SUM(chips), 0) AS credito_dado
FROM transactions
WHERE operation_type = 'CREDITO_FICHAS';

-- Pagamentos recebidos (fichas)
SELECT COALESCE(SUM(chips), 0) AS pago_fichas
FROM transactions
WHERE operation_type = 'CREDITO_PAGAMENTO_FICHAS';

-- Pagamentos recebidos (dinheiro)
SELECT COALESCE(SUM(value), 0) AS pago_dinheiro
FROM transactions
WHERE operation_type = 'CREDITO_PAGAMENTO_DINHEIRO';

-- Abatimentos via cashback
SELECT COALESCE(SUM(value), 0) AS abatimentos
FROM transactions
WHERE operation_type = 'CASHBACK_PAGAMENTO_DIVIDA';

-- Dívida atual por jogador
SELECT
  p.id,
  p.name,
  p.nick,
  COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_FICHAS' THEN t.chips ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_PAGAMENTO_FICHAS' THEN t.chips ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.operation_type = 'CREDITO_PAGAMENTO_DINHEIRO' THEN t.value ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.operation_type = 'CASHBACK_PAGAMENTO_DIVIDA' THEN t.value ELSE 0 END), 0)
  AS divida_atual
FROM players p
LEFT JOIN transactions t ON t.player_id = p.id
GROUP BY p.id, p.name, p.nick
HAVING (... > 0)  -- apenas jogadores com dívida
ORDER BY divida_atual DESC;
```

### 4.4 Saldo Ranking

```sql
SELECT
  COALESCE(SUM(CASE WHEN operation_type = 'RANKING_COLETA' THEN chips ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN operation_type = 'RANKING_PAGAMENTO_FICHAS' THEN chips ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN operation_type = 'RANKING_PAGAMENTO_DINHEIRO' THEN value ELSE 0 END), 0)
  AS saldo_ranking
FROM transactions;
```

### 4.5 Saldo Geral

```sql
-- Implementar como RPC no Supabase
CREATE OR REPLACE FUNCTION get_saldo_geral()
RETURNS JSONB AS $$
DECLARE
  v_total_bancos     NUMERIC;
  v_credito          NUMERIC;
  v_fichas           NUMERIC;
  v_ranking          NUMERIC;
BEGIN
  -- Total bancos
  SELECT COALESCE(SUM(get_bank_balance(id)), 0)
  INTO v_total_bancos FROM banks WHERE is_active = true;

  -- Crédito concedido (dívidas abertas)
  SELECT (credito_dado - pago_fichas - pago_dinheiro - abatimentos)
  INTO v_credito
  FROM (...); -- query da seção 4.3

  -- Fichas em circulação
  SELECT fichas_circulacao INTO v_fichas FROM (...); -- query da seção 4.1

  -- Saldo ranking
  SELECT saldo_ranking INTO v_ranking FROM (...); -- query da seção 4.4

  RETURN jsonb_build_object(
    'total_bancos', v_total_bancos,
    'credito_concedido', v_credito,
    'fichas_circulacao', v_fichas,
    'saldo_ranking', v_ranking,
    'saldo_geral', v_total_bancos + v_credito - v_fichas - v_ranking
  );
END;
$$ LANGUAGE plpgsql;
```

### 4.6 Resultado Financeiro Mensal

```sql
-- Receitas do mês
SELECT
  COALESCE(SUM(CASE WHEN operation_type = 'RAKE' THEN chips ELSE 0 END), 0) AS rake,
  COALESCE(SUM(CASE WHEN operation_type = 'RANKING_COLETA' THEN chips ELSE 0 END), 0) AS ranking_coletas
FROM transactions
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', p_mes);

-- Despesas do mês
SELECT
  COALESCE(SUM(CASE WHEN operation_type = 'CUSTO_DESPESA' THEN value ELSE 0 END), 0) AS custos_operacionais,
  COALESCE(SUM(CASE WHEN operation_type IN ('RANKING_PAGAMENTO_FICHAS', 'RANKING_PAGAMENTO_DINHEIRO') THEN COALESCE(chips, value) ELSE 0 END), 0) AS ranking_premios,
  COALESCE(SUM(CASE WHEN operation_type IN ('CASHBACK_DINHEIRO', 'CASHBACK_FICHAS') THEN COALESCE(value, chips) ELSE 0 END), 0) AS cashback_agentes  -- GAP: confirmar inclusão
FROM transactions
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', p_mes);

-- Resultado = Receitas - Despesas
```

### 4.7 Cálculo ChipPix (Aplicar no Backend)

```typescript
// lib/chippix.ts
const CHIPPIX_FEE = 0.50;

export function calcularValorChippix(chips: number, direcao: 'deposito' | 'saque'): number {
  if (direcao === 'deposito') {
    return chips - CHIPPIX_FEE;  // clube recebe menos
  } else {
    return chips + CHIPPIX_FEE;  // clube paga mais
  }
}

// Ao criar uma transaction LOG via ChipPix:
// - chips: valor informado pelo operador (X fichas do jogador)
// - value: calcularValorChippix(chips, direcao) — valor real que entra/sai do banco ChipPix
```

### 4.8 Resultado por Jogador

```sql
SELECT
  p.id,
  p.name,
  p.nick,
  COALESCE(SUM(CASE WHEN t.operation_type = 'SAQUE_FICHAS' THEN t.chips ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.operation_type IN ('COMPRA_FICHAS', 'CREDITO_FICHAS') THEN t.chips ELSE 0 END), 0)
  AS resultado,  -- positivo = jogador vencedor, negativo = perdedor
  COALESCE(SUM(CASE WHEN t.operation_type IN ('COMPRA_FICHAS', 'CREDITO_FICHAS') THEN t.chips ELSE 0 END), 0) AS total_compras,
  COALESCE(SUM(CASE WHEN t.operation_type = 'SAQUE_FICHAS' THEN t.chips ELSE 0 END), 0) AS total_saques,
  COALESCE(SUM(CASE WHEN t.operation_type IN ('CASHBACK_DINHEIRO', 'CASHBACK_FICHAS') THEN COALESCE(t.value, t.chips) ELSE 0 END), 0) AS total_cashback
FROM players p
LEFT JOIN transactions t ON t.player_id = p.id
WHERE p.id = p_player_id
GROUP BY p.id, p.name, p.nick;
```

---

## 5. STACK E ARQUITETURA

### 5.1 Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js App Router | 14+ |
| Linguagem | TypeScript | 5+ |
| Banco de Dados | Supabase (PostgreSQL) | latest |
| Auth | Supabase Auth | — |
| Estilo | Tailwind CSS | 3+ |
| Componentes | shadcn/ui | latest |
| Tabelas | TanStack Table | v8 |
| Gráficos | Recharts | 2+ |
| Formulários | React Hook Form + Zod | — |
| Datas | date-fns | 3+ |

### 5.2 Estrutura de Pastas

```
/app
  /login                         → página de login
  /(protected)                   → layout com autenticação
    /dashboard                   → dashboard
    /operacional
      /log                       → LOG PPPoker
      /conciliacao               → Conciliação Diária
      /rake                      → Rake diário
    /ranking
      /page.tsx                  → Painel Ranking
      /calculadora               → Calculadora de Ranking
    /agentes
      /page.tsx                  → Agentes PPPoker
      /suprema                   → Agentes Suprema
    /rake-semanal                → Rake Semanal / Rakeback
    /jogadores
      /page.tsx                  → Lista de Jogadores
      /[id]                      → Perfil do Jogador (Consulta)
      /credito                   → Controle de Crédito
    /financeiro
      /custos                    → Custos Operacionais
      /resultado                 → Resultado Financeiro + Gráficos
      /bancos                    → Gestão de Bancos
    /historico                   → Audit Log (Histórico)
    /usuarios                    → Gestão de Usuários (CODE only)
    /ajuste-inicial              → Ajuste Inicial (CODE only)

/components
  /ui                            → shadcn components
  /layout
    sidebar.tsx
    header.tsx
  /shared
    data-table.tsx               → TanStack Table wrapper
    currency-display.tsx         → formatação de moeda
    date-picker.tsx
    player-selector.tsx          → combobox de jogadores
    bank-selector.tsx

/lib
  /supabase
    client.ts                    → browser client
    server.ts                    → server client
    middleware.ts
  /calculations
    fichas.ts                    → cálculo de fichas em circulação
    saldos.ts                    → saldo por banco, saldo geral
    credito.ts                   → crédito concedido / dívidas
    ranking.ts                   → pool de ranking
    resultado.ts                 → resultado financeiro mensal
    jogador.ts                   → resultado por jogador
  /chippix.ts                    → taxa ChipPix
  /competencia.ts                → geração de string de competência
  /formatters.ts                 → format currency, date, etc.

/actions
  log.ts                         → Server Actions do LOG
  conciliacao.ts
  rake.ts
  ranking.ts
  agentes.ts
  rake-semanal.ts
  jogadores.ts
  bancos.ts
  usuarios.ts
  ajuste-inicial.ts

/types
  database.types.ts              → tipos gerados pelo Supabase CLI
  index.ts                       → tipos de domínio
```

### 5.3 Autenticação e Middleware

```typescript
// middleware.ts
// Proteger todas as rotas exceto /login
// Verificar role do usuário e redirecionar se sem permissão
// Implementar com Supabase Auth + cookies (SSR)
```

### 5.4 Row Level Security (RLS)

Todas as tabelas com RLS. Política base:

```sql
-- Usuários autenticados podem ler tudo (filtrado pelo middleware no app)
CREATE POLICY "authenticated_read" ON transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas o próprio app (service role) escreve
-- Todo insert/update/delete via Server Actions com service role client
```

---

## 6. MÓDULOS — ESPECIFICAÇÃO DETALHADA

### 6.1 LOGIN

- Email + senha via Supabase Auth
- Redirect para `/dashboard` após login bem-sucedido
- Se usuário `is_active = false`, negar acesso mesmo com credenciais corretas
- Sem "esqueci a senha" por enquanto

---

### 6.2 DASHBOARD

Painel de leitura. Todos os valores calculados via Server Components ou RPCs.

**Cards — Dados Gerais (sempre atuais):**

| Card | Valor | Cor |
|------|-------|-----|
| Total em Fichas | `fichas_circulacao` | Verde se > 0 |
| Caixa | `total_bancos` | Verde |
| Jogadores Cadastrados | `COUNT(players)` | Neutro |
| Fichas Ranking | `saldo_ranking` | Laranja |
| Crédito Fornecido | `credito_concedido` | Amarelo |
| **Saldo Geral** | `saldo_geral` | Verde/Vermelho |

**Fórmula exibida no card Saldo Geral:**  
`Caixa (X) + Crédito (X) - Fichas (X) - Ranking (X) = R$ Y`

**Saldos por Banco:** um card por banco ativo.

**Dados Mensais (filtro por mês — padrão: mês atual):**
- Rake Mensal
- Custo Mensal
- Cashback Agentes

---

### 6.3 LOG PPPoker

**Layout:**
- Lado esquerdo: calendário para selecionar o dia
- Lado direito superior: Total Atual de Fichas em Circulação (global, não do dia)
- Lado direito inferior: registros do dia selecionado + botão "+ Novo Log"

**Campos do formulário de novo Log:**

| Campo | Tipo | Obrigatório | Notas |
|-------|------|:-----------:|-------|
| Tipo | select | ✅ | ENVIO / RECEBIMENTO |
| Jogador | combobox | ✅ | busca por nick ou nome |
| Valor (fichas) | number | ✅ | sempre positivo |
| Origem | select | ✅ | MANUAL / CHIPPIX |
| Data | date | ✅ | default: hoje |
| Observações | textarea | ❌ | — |

> **Nota sobre Acordo no LOG:** acordos são registrados diretamente na Conciliação (seção 6.4), não no LOG, pois são dois lançamentos vinculados. O LOG registra apenas movimentações simples (ENVIO / RECEBIMENTO).

**Ao salvar um Log:**
1. Criar registro em `transactions` com `type = 'LOG'`, `operation_type = null` (pendente de conciliação), `reconciled = false`
2. Se `origem = 'CHIPPIX'`:
   - `chips` = valor informado pelo operador
   - `value` = `calcularValorChippix(chips, direcao)` — preenchido automaticamente
3. Gerar `competencia` automaticamente a partir da data
4. Registrar em `audit_log`

**Exibição na tabela:**

| # | Tipo | Jogador | Valor (fichas) | Origem | Ações |
|---|------|---------|---------------|--------|-------|

---

### 6.4 CONCILIAÇÃO DIÁRIA

**Layout:**
- Calendário para selecionar o dia
- Cards do dia: Fichas (Enviadas / Recebidas / Saldo), Caixa (Entradas / Saídas / Saldo), Saldos por Banco
- Lista de transações com filtros: Todos | Pendentes | Conciliados | Verificados
- Botão "+ Nova Transação" (cria direto na conciliação, sem passar pelo LOG)

**Estados de uma transação:**
- `Pendente`: `reconciled = false`
- `Conciliado`: `reconciled = true`
- `Verificado`: `verified = true` (pode ser true mesmo sendo pendente — é controle visual independente)

**Modal "Cadastrar Transação" — campos dinâmicos por tipo:**

O tipo de operação determina quais campos aparecem. Implementar com visibilidade condicional.

```typescript
const camposPorTipo: Record<string, CamposConfig> = {
  COMPRA_FICHAS:               { jogador: true,  banco: true,  fichas: true,  valor: true,  comprovante: true  },
  CREDITO_FICHAS:              { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false },
  SAQUE_FICHAS:                { jogador: true,  banco: true,  fichas: true,  valor: true,  comprovante: false },
  CREDITO_PAGAMENTO_DINHEIRO:  { jogador: true,  banco: true,  fichas: false, valor: true,  comprovante: true  },
  CREDITO_PAGAMENTO_FICHAS:    { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false },
  CUSTO_DESPESA:               { jogador: false, banco: true,  fichas: false, valor: true,  comprovante: false },
  DEPOSITO_AVULSO:             { jogador: false, banco: true,  fichas: false, valor: true,  comprovante: false },
  SAQUE_AVULSO:                { jogador: false, banco: true,  fichas: false, valor: true,  comprovante: false },
  ACORDO_COLETA:               { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false, acordo: true },
  ACORDO_PAGAMENTO:            { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false, acordo: true },
  RANKING_COLETA:              { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false },
  RANKING_PAGAMENTO_FICHAS:    { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false },
  RANKING_PAGAMENTO_DINHEIRO:  { jogador: true,  banco: true,  fichas: false, valor: true,  comprovante: false },
  CASHBACK_DINHEIRO:           { jogador: true,  banco: true,  fichas: false, valor: true,  comprovante: false },
  CASHBACK_FICHAS:             { jogador: true,  banco: false, fichas: true,  valor: false, comprovante: false },
  CASHBACK_PAGAMENTO_DIVIDA:   { jogador: true,  banco: false, fichas: false, valor: true,  comprovante: false },
}
```

**Regra especial — ACORDO:**  
Quando o operador seleciona ACORDO_COLETA ou ACORDO_PAGAMENTO, o formulário exige os **dois lados** juntos (De quem: jogador A, Para quem: jogador B, Valor). Ao salvar, o sistema cria **dois registros** em `transactions` com o mesmo `acordo_id` (UUID gerado na hora).

**Regra ChipPix na Conciliação:**  
Se a transação do LOG tem `origem = 'CHIPPIX'`, ao conciliar, o campo `value` (R$) já vem pré-preenchido com o valor calculado. O operador confirma ou corrige.

---

### 6.5 RAKE

- Filtro por mês (padrão: mês atual)
- Card "Rake do Mês" + Card "Rake Acumulado" (total histórico)
- Lista de registros do mês: Data | Valor | Ações (editar)
- Botão "+ Novo Rake"

**Formulário:**
- Data (obrigatório)
- Valor (obrigatório)
- Competência (gerada automaticamente)

**Ao salvar:**
1. Criar `transaction` com `operation_type = 'RAKE'`, `type = 'LOG'`, `chips = valor`, `reconciled = true`
2. Registrar em `audit_log`

---

### 6.6 RANKING

**Painel Ranking — Cards:**
- Fichas Coletadas (mês)
- Prêmios (Fichas) (mês)
- Prêmios (Dinheiro) (mês)
- Saldo Ranking (acumulado total)

**Lista:** todas as transações de ranking do mês filtrado.

---

### 6.7 CALCULADORA DE RANKING

**Seção Coleta:**
- Percentual de Coleta (%)  — aplicado globalmente a todos os jogadores da rodada
- Tabela com linhas: Jogador | Prêmio Ganho | Valor a Coletar (calculado: prêmio × %)
- Botão "+ Adicionar Jogador"
- Botão "Confirmar Coletas" — cria todos os registros de uma vez

**Seção Pagamento:**
- Banco para pagamentos PIX
- Tabela com linhas: Jogador | Modalidade (Fichas / Dinheiro / Abate Dívida) | Valor
- Botão "Confirmar Pagamentos"

**Ao confirmar coletas:**
```typescript
// Para cada linha:
// 1. Calcular chips = premio * (pct / 100)
// 2. Criar transaction: operation_type = 'RANKING_COLETA', chips = chips, reconciled = true
// 3. Criar ranking_transaction: type = 'COLETA', chips, total_prize, pct_collected
// 4. Registrar em audit_log
```

---

### 6.8 AGENTES

**Tabs: PPPoker | Suprema**

**Lista de agentes:**
- Expandível por agente mostrando jogadores da pasta
- Cada agente exibe: Nome, Nick, ID PPPoker, Rakeback%, LPBR%, Qtd. Jogadores
- Botão "+ Novo Agente", ícones de editar/excluir por agente
- Botão "+ Adicionar Jogador" dentro de cada agente

**Formulário Novo Agente:**
- Jogador (combobox — agente também é um jogador)
- Rakeback% + LPBR% (validação: soma = 100)
- Plataforma (PPPoker ou Suprema)

---

### 6.9 RAKE SEMANAL

**Conceitos:**
- **Rake Semanal:** rake gerado por cada agente em uma semana
- **Rake Mensal:** acumulado do mês (visão gerencial)
- Pagamento de rakeback é **semanal** (toda segunda-feira)

**Layout:**
- Navegação por semana (← Semana → )
- Exibe: datas da semana (ex: "02/03 - 08/03/2026") + label "Semana 10/2026"
- Tabs: PPPoker | Suprema

**Tabela por agente:**

| Agente | Rakeback% | Valor Rake | Rakeback (a pagar) | LPBR |
|--------|:---------:|:----------:|:------------------:|:----:|
| Marcelo Caetano | 30% | [input] | R$ calc | R$ calc |

- Campo "Valor Rake" é editável pelo operador
- Rakeback = Valor Rake × Rakeback% (calculado em tempo real)
- LPBR = Valor Rake × LPBR% (calculado em tempo real)
- Botão "Salvar Tudo"

**Ao salvar:**
1. Para cada agente com valor preenchido:
   - Criar `transaction`: `operation_type = 'RAKE_AGENTE'`, `type = 'LOG'`, `chips = valor_rakeback`, `player_id = agente.player_id`, `reconciled = false`
   - Registrar em `audit_log`
2. Os lançamentos aparecem na fila de Conciliação para o operador conciliar o pagamento

---

### 6.10 JOGADORES

**6.10.1 Lista de Jogadores**
- Busca por código PPPoker, nick ou nome
- Colunas: Código PPPoker | Nick PPPoker | Nome | Observação | Ações
- Ações: editar, excluir
- Ao clicar em uma linha: abre modal com panorama do jogador

**Modal Panorama (ao clicar na linha):**
- Total Comprado
- Total Sacado
- Dívida de Crédito
- Resultado (Saques - Compras) com label "Jogador está ganhando/perdendo no longo prazo"

**6.10.2 Consulta de Jogadores**
- Combobox para selecionar jogador (busca por nome/nick/código)
- Filtro por período (mês/todos)
- Cards: Total Compras | Total Saques | Saldo Crédito | Total Cashback | Lucro/Prejuízo
- Tabela "Histórico de Transações": Data | Tipo | Fichas | Dinheiro | Banco | Descrição

**6.10.3 Crédito**
- Card "Total em Crédito" (soma de todas as dívidas abertas)
- Lista de jogadores com dívida (expandível)
- Ao expandir: histórico de crédito dado + pagamentos recebidos
- Tipo exibido: "Pegou Fichas" (CREDITO_FICHAS), "Pagou R$" (CREDITO_PAGAMENTO_DINHEIRO), etc.

---

### 6.11 FINANCEIRO

**6.11.1 Custos**
- Filtro por mês
- Card "Total de Custos" + Card "Quantidade de Lançamentos"
- Lista: Data | Descrição | Banco | Valor
- Botão "+ Novo Custo"

**Formulário Novo Custo:**
- Data, Descrição, Categoria, Banco, Valor
- Ao salvar: cria `transaction` com `operation_type = 'CUSTO_DESPESA'` + registro em `costs`

**6.11.2 Resultado Financeiro**
- Filtro por mês
- Seção Receitas: Rake | Ranking (Coletas) | **Total Receitas**
- Seção Despesas: Custos Operacionais | Ranking (Prêmios) | Cashback Agentes | **Total Despesas**
- Seção Resultado: Resultado do Mês | Resultado Acumulado
- Gráfico de evolução mensal (Recharts — LineChart)

**6.11.3 Bancos**
- Cards com saldo atual por banco
- Lista de todos os bancos: Nome | Saldo Atual | Ações (editar)
- Botão "+ Novo Banco"

---

### 6.12 HISTÓRICO (Audit Log)

- Campo de busca: filtrar por descrição, usuário ou área
- Lista: Data/Hora | Usuário | Ação | Área | Registro Afetado
- Máximo 500 registros (paginação ou limit)
- Sem edição/exclusão — apenas leitura

---

### 6.13 GESTÃO DE USUÁRIOS (CODE only)

- Lista: Email | Tipo (role) | Criado em | Ações
- Botão "+ Novo Usuário"
- Ações: editar senha (ícone de chave), excluir
- Formulário: Email, Nome, Role (CODE/ADMIN/USER)

---

### 6.14 AJUSTE INICIAL (CODE only)

- Aviso de uso único (banner de atenção)
- Seção "Saldos dos Bancos": para cada banco, campo numérico + exibe "Atual: R$ X" + ✅ OK quando bate
- Seção "Total em Fichas": campo numérico para fichas em circulação no momento zero
- Seção "Saldo Ranking": campo numérico para pool de ranking inicial
- Botão "Salvar Ajuste Inicial"

**Ao salvar:**
1. Para cada banco com valor != 0: criar `transaction` com `operation_type = 'AJUSTE_INICIAL'`, `type = 'CONTROL'`, `bank_id`, `value = valor_informado`
2. Atualizar `banks.initial_balance` com os valores
3. Criar `transaction` de ajuste de fichas se necessário
4. Registrar em `audit_log`

---

## 7. CONVENÇÕES DE CÓDIGO

### 7.1 Formatação de Valores

```typescript
// lib/formatters.ts

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChips(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Nunca exibir mais que 2 casas decimais
// Nunca arredondar valores em cálculos — apenas no display
```

### 7.2 Geração de Competência

```typescript
// lib/competencia.ts

export function getCompetencia(date: Date): string {
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
  const year = date.getFullYear();
  return `SEM${weekOfMonth} ${month}/${year}`;
  // ex: "SEM1 MAR/2026"
}
```

### 7.3 Server Actions — Padrão

```typescript
// actions/log.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const NovoLogSchema = z.object({
  date: z.string(),
  tipo: z.enum(['ENVIO', 'RECEBIMENTO']),
  player_id: z.string().uuid(),
  chips: z.number().positive(),
  origem: z.enum(['MANUAL', 'CHIPPIX']),
  notes: z.string().optional(),
})

export async function criarLog(data: z.infer<typeof NovoLogSchema>) {
  const supabase = createServerClient()
  
  // Validação
  const parsed = NovoLogSchema.parse(data)
  
  // Calcular value se ChipPix
  let value: number | null = null
  if (parsed.origem === 'CHIPPIX') {
    const direcao = parsed.tipo === 'ENVIO' ? 'deposito' : 'saque'
    value = calcularValorChippix(parsed.chips, direcao)
  }
  
  // Inserir transação
  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      date: parsed.date,
      operation_type: null,  // será definido na conciliação
      type: 'LOG',
      chips: parsed.chips,
      value,
      origem: parsed.origem,
      player_id: parsed.player_id,
      reconciled: false,
      competencia: getCompetencia(new Date(parsed.date)),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Audit log
  await supabase.from('audit_log').insert({
    action: `Novo log criado: ${parsed.tipo} ${parsed.chips} fichas`,
    table_name: 'transactions',
    record_id: tx.id,
    new_value: tx,
  })

  revalidatePath('/operacional/log')
  return { success: true, data: tx }
}
```

### 7.4 Componente de Moeda

```typescript
// Sempre exibir valores com cor:
// Verde: positivo / entrada / lucro
// Vermelho: negativo / saída / prejuízo
// Laranja: ranking / atenção
// Preto/neutro: valores neutros
```

---

## 8. IDENTIDADE VISUAL

- **Cor primária:** vermelho (`#E53E3E` ou `red-600` do Tailwind)
- **Logo:** "LP" em vermelho, fundo vermelho rounded
- **Fonte:** padrão do sistema (Inter via Next.js)
- **Sidebar:** fundo branco, texto cinza escuro, item ativo em vermelho
- **Grupos do sidebar:** OPERACIONAL | RANKING | JOGADORES | FINANCEIRO | DESENVOLVEDOR
- **Botões primários:** fundo vermelho, texto branco
- **Valores positivos:** verde (`green-600`)
- **Valores negativos:** vermelho (`red-600`)
- **Valores de ranking/atenção:** laranja (`orange-500`)
- **Crédito/dívida:** amarelo/âmbar (`amber-500`)

---

## 9. ORDEM DE DESENVOLVIMENTO RECOMENDADA

1. **Setup:** Next.js + Supabase + shadcn/ui + Tailwind
2. **Auth:** Login, middleware, proteção de rotas
3. **Database:** Criar todas as tabelas + RLS + índices
4. **Ajuste Inicial:** primeiro módulo a funcionar (sem dados, sistema não opera)
5. **LOG:** registro de movimentações
6. **Conciliação:** conciliação das movimentações do LOG
7. **Rake:** registro diário
8. **Bancos:** gestão de contas (necessário para Conciliação)
9. **Dashboard:** todos os cálculos centrais
10. **Jogadores:** lista + consulta + crédito
11. **Ranking + Calculadora de Ranking**
12. **Agentes + Rake Semanal**
13. **Financeiro:** custos + resultado + gráficos
14. **Histórico:** audit log
15. **Usuários:** gestão de usuários

---

## 10. GLOSSÁRIO

| Termo | Significado |
|-------|------------|
| Fichas | Unidade virtual do PPPoker. 1 ficha = R$ 1,00 |
| LOG | Registro de movimentações de fichas no PPPoker |
| Conciliação | Processo de identificar e dar destino a cada transação do LOG |
| Rake | Taxa retirada dos jogadores durante o jogo. Receita do clube. |
| Rakeback | Comissão paga aos agentes pelo rake gerado pela sua pasta |
| LPBR | Percentual do rake que fica no clube (Live Poker BR) |
| Competência | Período de referência no formato `SEM1 MAR/2026` |
| Crédito / Dívida | Fichas dadas a um jogador sem pagamento prévio |
| Acordo | Transferência direta de fichas entre dois jogadores, intermediada pelo clube |
| ChipPix | Ferramenta externa de automação de pagamentos (R$0,50/transação) |
| Suprema | App externo onde o clube atua como agente |
| Pool Ranking | Reserva de fichas coletadas para pagamento do ranking |
| CODE | Role master (acesso total). Usuário: pedro.sato@gmail.com |
| ADMIN | Role administrativo. Usuário: sandrocasarini@gmail.com |
| USER | Funcionários com acesso operacional limitado |
| Origem MANUAL | Transação feita diretamente pelo clube, sem ChipPix |
| Origem CHIPPIX | Transação processada pelo ChipPix — taxa de R$0,50 aplicada automaticamente |

---

*Este documento é a fonte única de verdade para o desenvolvimento do LIVEBR. Qualquer divergência entre este documento e o código deve ser resolvida atualizando o código para refletir o documento, salvo quando discutido e aprovado explicitamente.*
