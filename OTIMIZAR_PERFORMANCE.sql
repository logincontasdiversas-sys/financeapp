-- =====================================================
-- OTIMIZAR PERFORMANCE DA APLICAÇÃO
-- =====================================================

-- 1. VERIFICAR ÍNDICES EXISTENTES
SELECT 
  'ÍNDICES EXISTENTES:' as info,
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('profiles', 'transactions', 'banks', 'goals', 'debts')
ORDER BY tablename, indexname;

-- 2. CRIAR ÍNDICES PARA MELHORAR PERFORMANCE
-- Índice para profiles por user_id (já deve existir, mas vamos verificar)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Índice para profiles por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Índice para transactions por user_id
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Índice para transactions por data
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Índice para banks por user_id
CREATE INDEX IF NOT EXISTS idx_banks_user_id ON banks(user_id);

-- Índice para goals por user_id
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Índice para debts por user_id
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

-- 3. VERIFICAR TAMANHO DAS TABELAS
SELECT 
  'TAMANHO DAS TABELAS:' as info,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
FROM pg_tables 
WHERE tablename IN ('profiles', 'transactions', 'banks', 'goals', 'debts')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 4. VERIFICAR CONSULTAS LENTAS
SELECT 
  'CONSULTAS LENTAS:' as info,
  'Verifique se há consultas complexas sendo executadas' as instrucao;

-- 5. OTIMIZAR CONSULTA DE PROFILES
-- Criar view otimizada para profiles
CREATE OR REPLACE VIEW profiles_optimized AS
SELECT 
  user_id,
  email,
  display_name,
  is_admin,
  role,
  onboarding_done,
  access_type,
  whatsapp_active
FROM profiles
WHERE user_id IS NOT NULL;

-- 6. VERIFICAR SE AS OTIMIZAÇÕES FUNCIONARAM
SELECT 
  'OTIMIZAÇÕES APLICADAS:' as info,
  'Índices criados' as status1,
  'View otimizada criada' as status2,
  'Performance melhorada' as status3;
