# 🔧 SQL CORRETO para Executar no Supabase

## ❌ Erro que você teve:
```
ERROR: 42P01: relation "information_schema.colum" does not exist
```

**Problema:** Você digitou `colum` em vez de `columns`

## ✅ SQL CORRETO:

### 1. PRIMEIRO - Verificar se a coluna existe:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'debts'
ORDER BY ordinal_position;
```

### 2. SE a coluna `current_amount` NÃO aparecer na lista acima, execute:
```sql
ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;
```

### 3. Adicionar comentário à coluna:
```sql
COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';
```

### 4. Verificar novamente se a coluna foi criada:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'debts'
ORDER BY ordinal_position;
```

## 📋 Instruções:
1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: `cibtvihaydjlsjjfytkt`
3. Vá para SQL Editor
4. Execute os comandos acima na ordem
5. Após executar, teste o campo "Valor Atual" na página de Dívidas

## ✅ Resultado Esperado:
- A coluna `current_amount` deve aparecer na lista do passo 4
- O campo "Valor Atual" deve funcionar sem erros
