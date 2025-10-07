-- =====================================================
-- SCRIPT DE BACKUP DAS TABELAS DESNECESSÁRIAS
-- =====================================================
-- Execute este script ANTES de remover as tabelas
-- para fazer backup dos dados importantes

-- =====================================================
-- 1. BACKUP TABELAS KIWIFY
-- =====================================================

-- Backup kiwify_products
CREATE TABLE IF NOT EXISTS backup_kiwify_products AS 
SELECT * FROM kiwify_products;

-- Backup kiwify_purchases  
CREATE TABLE IF NOT EXISTS backup_kiwify_purchases AS 
SELECT * FROM kiwify_purchases;

-- Backup kiwify_webhook_logs
CREATE TABLE IF NOT EXISTS backup_kiwify_webhook_logs AS 
SELECT * FROM kiwify_webhook_logs;

-- =====================================================
-- 2. BACKUP TABELA WHATSAPP_USERS
-- =====================================================

-- Backup whatsapp_users
CREATE TABLE IF NOT EXISTS backup_whatsapp_users AS 
SELECT * FROM whatsapp_users;

-- =====================================================
-- 3. BACKUP TABELA PROFILES_BACKUP
-- =====================================================

-- Backup profiles_backup
CREATE TABLE IF NOT EXISTS backup_profiles_backup AS 
SELECT * FROM profiles_backup;

-- =====================================================
-- 4. BACKUP TABELA BUDGETS
-- =====================================================

-- Backup budgets
CREATE TABLE IF NOT EXISTS backup_budgets AS 
SELECT * FROM budgets;

-- =====================================================
-- 5. BACKUP VIEWS (SE FOREM TABELAS)
-- =====================================================

-- Verificar se v_bank_balances é uma tabela
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'v_bank_balances' AND table_type = 'BASE TABLE') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_v_bank_balances AS SELECT * FROM v_bank_balances';
    END IF;
END $$;

-- Verificar se v_card_spent_month é uma tabela
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'v_card_spent_month' AND table_type = 'BASE TABLE') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_v_card_spent_month AS SELECT * FROM v_card_spent_month';
    END IF;
END $$;

-- Verificar se v_totals_month_year é uma tabela
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'v_totals_month_year' AND table_type = 'BASE TABLE') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_v_totals_month_year AS SELECT * FROM v_totals_month_year';
    END IF;
END $$;

-- =====================================================
-- 6. VERIFICAR BACKUPS CRIADOS
-- =====================================================

-- Listar todas as tabelas de backup criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'backup_%'
ORDER BY tablename;

-- =====================================================
-- 7. EXPORTAR BACKUPS PARA ARQUIVOS
-- =====================================================

-- Para exportar os dados, use os comandos abaixo no terminal:
-- psql -h [HOST] -U [USER] -d [DATABASE] -c "\copy backup_kiwify_products TO 'backup_kiwify_products.csv' WITH CSV HEADER"
-- psql -h [HOST] -U [USER] -d [DATABASE] -c "\copy backup_kiwify_purchases TO 'backup_kiwify_purchases.csv' WITH CSV HEADER"
-- psql -h [HOST] -U [USER] -d [DATABASE] -c "\copy backup_kiwify_webhook_logs TO 'backup_kiwify_webhook_logs.csv' WITH CSV HEADER"
-- psql -h [HOST] -U [USER] -d [DATABASE] -c "\copy backup_whatsapp_users TO 'backup_whatsapp_users.csv' WITH CSV HEADER"
-- psql -h [HOST] -U [USER] -d [DATABASE] -c "\copy backup_profiles_backup TO 'backup_profiles_backup.csv' WITH CSV HEADER"
-- psql -h [HOST] -U [USER] -d [DATABASE] -c "\copy backup_budgets TO 'backup_budgets.csv' WITH CSV HEADER"

-- =====================================================
-- 8. INFORMAÇÕES DOS BACKUPS
-- =====================================================

-- Mostrar quantidade de registros em cada backup
SELECT 
    'backup_kiwify_products' as tabela,
    COUNT(*) as registros
FROM backup_kiwify_products
UNION ALL
SELECT 
    'backup_kiwify_purchases' as tabela,
    COUNT(*) as registros
FROM backup_kiwify_purchases
UNION ALL
SELECT 
    'backup_kiwify_webhook_logs' as tabela,
    COUNT(*) as registros
FROM backup_kiwify_webhook_logs
UNION ALL
SELECT 
    'backup_whatsapp_users' as tabela,
    COUNT(*) as registros
FROM backup_whatsapp_users
UNION ALL
SELECT 
    'backup_profiles_backup' as tabela,
    COUNT(*) as registros
FROM backup_profiles_backup
UNION ALL
SELECT 
    'backup_budgets' as tabela,
    COUNT(*) as registros
FROM backup_budgets;

-- =====================================================
-- INSTRUÇÕES IMPORTANTES
-- =====================================================
-- 1. Execute este script ANTES de remover as tabelas
-- 2. Verifique se os backups foram criados corretamente
-- 3. Exporte os dados para arquivos CSV se necessário
-- 4. Mantenha os backups por pelo menos 30 dias
-- 5. Só remova os backups após confirmar que tudo funciona
-- =====================================================
