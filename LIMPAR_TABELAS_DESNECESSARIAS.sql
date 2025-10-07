-- =====================================================
-- SCRIPT PARA REMOVER TABELAS DESNECESSÁRIAS
-- =====================================================
-- Este script remove tabelas e views que não são utilizadas
-- no aplicativo FinanceApp para otimizar o banco de dados

-- ⚠️ ATENÇÃO: Execute este script com cuidado!
-- ⚠️ Faça backup antes de executar!
-- ⚠️ Verifique se não há dados importantes nas tabelas!

-- =====================================================
-- 1. REMOVER VIEWS NÃO UTILIZADAS
-- =====================================================

-- Remover view de saldos bancários (não utilizada)
DROP VIEW IF EXISTS v_bank_balances CASCADE;

-- Remover view de gastos mensais de cartão (não utilizada)
DROP VIEW IF EXISTS v_card_spent_month CASCADE;

-- Remover view de totais mensais/anuais (não utilizada)
DROP VIEW IF EXISTS v_totals_month_year CASCADE;

-- =====================================================
-- 2. REMOVER TABELAS KIWIFY (NÃO UTILIZADAS)
-- =====================================================

-- Remover tabela de produtos Kiwify
DROP TABLE IF EXISTS kiwify_products CASCADE;

-- Remover tabela de compras Kiwify
DROP TABLE IF EXISTS kiwify_purchases CASCADE;

-- Remover tabela de logs de webhook Kiwify
DROP TABLE IF EXISTS kiwify_webhook_logs CASCADE;

-- =====================================================
-- 3. REMOVER TABELA WHATSAPP_USERS (REDUNDANTE)
-- =====================================================

-- Os dados do WhatsApp já estão na tabela profiles
-- (whatsapp_active, phone_number, whatsapp_last_activity)
DROP TABLE IF EXISTS whatsapp_users CASCADE;

-- =====================================================
-- 4. REMOVER TABELA DE BACKUP (DESNECESSÁRIA)
-- =====================================================

-- Tabela de backup não é necessária
DROP TABLE IF EXISTS profiles_backup CASCADE;

-- =====================================================
-- 5. REMOVER TABELA BUDGETS (NÃO IMPLEMENTADA)
-- =====================================================

-- Tabela budgets não tem interface implementada
-- Apenas existe no backup mas não é utilizada
DROP TABLE IF EXISTS budgets CASCADE;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar tabelas restantes
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar views restantes
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- =====================================================
-- TABELAS QUE PERMANECEM (NECESSÁRIAS)
-- =====================================================
-- ✅ profiles - Usuários e dados pessoais
-- ✅ tenants - Organizações/empresas  
-- ✅ tenant_members - Membros das organizações
-- ✅ transactions - Transações financeiras
-- ✅ banks - Contas bancárias
-- ✅ credit_cards - Cartões de crédito
-- ✅ categories - Categorias de transações
-- ✅ goals - Metas financeiras
-- ✅ debts - Dívidas
-- ✅ notifications - Sistema de notificações push
-- =====================================================
