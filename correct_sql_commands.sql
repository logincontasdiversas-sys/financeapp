-- SQL CORRETO para verificar e adicionar a coluna current_amount

-- 1. PRIMEIRO: Verificar se a coluna current_amount existe na tabela debts
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'debts'
ORDER BY ordinal_position;

-- 2. SE a coluna current_amount NÃO aparecer na lista acima, execute:
ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;

-- 3. Adicionar comentário à coluna
COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';

-- 4. Verificar novamente se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'debts'
ORDER BY ordinal_position;
