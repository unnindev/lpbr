# Migração do Banco de Dados LIVEBR

## Ordem de Execução

Execute os scripts na seguinte ordem no **SQL Editor** do Supabase:

### 1. Migrar jogadores ANTES de dropar (se tabelas antigas ainda existem)

```sql
-- Primeiro, crie a tabela players temporariamente
-- (copie apenas a parte de CREATE TABLE players do arquivo 002)

-- Depois migre os jogadores
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
```

### 2. Dropar tabelas antigas
Execute: `001_drop_old_tables.sql`

### 3. Criar tabelas novas
Execute: `002_create_new_tables.sql`

### 4. Se não migrou no passo 1, importe via CSV
- Table Editor → players → Import from CSV
- Mapeie: codigo_pppoker → club_id, nick_pppoker → nick, nome → name, observacao → notes
- Defina is_active = true

### 5. Criar índices e RLS
Execute: `004_create_indexes_rls.sql`

### 6. Criar funções SQL
Execute: `005_create_functions.sql`

### 7. Criar usuários iniciais
1. No Supabase Dashboard → Authentication → Users
2. Crie os usuários:
   - pedro.sato@gmail.com (defina uma senha)
   - sandrocasarini@gmail.com (defina uma senha)
3. Copie os UUIDs gerados
4. Execute no SQL Editor:
```sql
INSERT INTO users (id, name, role, is_active) VALUES
  ('UUID_DO_PEDRO', 'Pedro Sato', 'CODE', true),
  ('UUID_DO_SANDRO', 'Sandro Casarini', 'ADMIN', true);
```

### 8. Criar bancos
```sql
INSERT INTO banks (name, initial_balance, is_active) VALUES
  ('ChipPix', 0, true),
  ('Nubank', 0, true);
  -- Adicione outros bancos conforme necessário
```

## Verificação

Após a migração, execute:

```sql
-- Verificar jogadores
SELECT COUNT(*) FROM players;  -- Deve retornar 94

-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Testar função de saldo geral
SELECT get_saldo_geral();
```

## Variáveis de Ambiente

Copie as credenciais do Supabase para `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Encontre essas chaves em: Supabase Dashboard → Settings → API
