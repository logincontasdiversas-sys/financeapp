# 🚨 MIGRAÇÃO URGENTE - Campo Valor Atual

## ❌ Problema Atual
O erro "Could not find the 'current_amount' column of 'debts' in the schema cache" está ocorrendo porque a coluna não existe no banco de dados.

## ✅ Solução
**EXECUTE IMEDIATAMENTE:**

### 1. Acesse o Supabase Dashboard
- URL: https://supabase.com/dashboard
- Projeto: `cibtvihaydjlsjjfytkt`

### 2. Vá para o SQL Editor
- Clique no ícone de código (SQL Editor) no menu lateral
- Ou acesse diretamente: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/sql

### 3. Execute este SQL:
```sql
ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;
COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';
```

### 4. Clique em "Run" para executar

### 5. Verifique se funcionou:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'debts' 
AND column_name = 'current_amount';
```

## 🎯 Resultado Esperado
Após executar a migração, o campo "Valor Atual" na página de Dívidas deve funcionar normalmente sem erros.

## 📝 Status
- ✅ Código implementado
- ✅ Deploy realizado
- ⏳ **MIGRAÇÃO PENDENTE** - Execute o SQL acima
