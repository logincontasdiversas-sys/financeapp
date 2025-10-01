# Instruções para Aplicar a Migração

## Problema
O erro "Could not find the 'current_amount' column of 'debts' in the schema cache" indica que a coluna `current_amount` não existe na tabela `debts` do banco de dados.

## Solução
Execute o seguinte SQL no painel do Supabase:

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard
- Selecione o projeto: cibtvihaydjlsjjfytkt

### 2. Execute o SQL
No SQL Editor do Supabase, execute:

```sql
-- Add current_amount column to debts table
ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;

-- Add comment to the column
COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';
```

### 3. Verificar a Migração
Após executar o SQL, verifique se a coluna foi criada:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'debts' 
AND column_name = 'current_amount';
```

## Arquivos Criados
- `supabase/migrations/20250125_add_current_amount_to_debts.sql` - Arquivo de migração
- `add_current_amount_column.sql` - SQL para execução manual
- `migrate.js` - Script de teste de conexão

## Status
- ✅ Código atualizado para incluir o campo `current_amount`
- ✅ Interface atualizada para mostrar o campo
- ⏳ Migração do banco de dados pendente (execução manual necessária)
