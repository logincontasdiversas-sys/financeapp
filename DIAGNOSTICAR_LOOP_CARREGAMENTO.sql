-- =====================================================
-- DIAGNOSTICAR LOOP DE CARREGAMENTO
-- =====================================================

-- 1. VERIFICAR USUÁRIO ADMIN ESPECÍFICO
SELECT 
  'USUÁRIO ADMIN:' as info,
  u.id,
  u.email,
  u.email_confirmed_at,
  p.display_name,
  p.is_admin,
  p.role,
  p.onboarding_done,
  '✅ DADOS COMPLETOS' as status
FROM auth.users u
JOIN profiles p ON u.id = p.user_id
WHERE u.id = '42d66a40-896f-4b85-9926-92a6c27ce4f4';

-- 2. VERIFICAR SE HÁ PROBLEMAS NA TABELA PROFILES
SELECT 
  'PROBLEMAS EM PROFILES:' as info,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN is_admin IS NULL THEN 1 END) as is_admin_null,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as role_null,
  COUNT(CASE WHEN onboarding_done IS NULL THEN 1 END) as onboarding_null
FROM profiles;

-- 3. VERIFICAR USUÁRIOS COM DADOS INCOMPLETOS
SELECT 
  'USUÁRIOS COM DADOS INCOMPLETOS:' as info,
  p.user_id,
  p.email,
  p.is_admin,
  p.role,
  p.onboarding_done,
  '❌ DADOS INCOMPLETOS' as status
FROM profiles p
WHERE p.is_admin IS NULL 
   OR p.role IS NULL 
   OR p.onboarding_done IS NULL;

-- 4. CORRIGIR DADOS INCOMPLETOS
UPDATE profiles 
SET 
  is_admin = COALESCE(is_admin, FALSE),
  role = COALESCE(role, 'user'),
  onboarding_done = COALESCE(onboarding_done, FALSE)
WHERE is_admin IS NULL 
   OR role IS NULL 
   OR onboarding_done IS NULL;

-- 5. VERIFICAR SE AS CORREÇÕES FUNCIONARAM
SELECT 
  'APÓS CORREÇÃO:' as info,
  p.user_id,
  p.email,
  p.is_admin,
  p.role,
  p.onboarding_done,
  '✅ DADOS CORRIGIDOS' as status
FROM profiles p
WHERE p.user_id = '42d66a40-896f-4b85-9926-92a6c27ce4f4';

-- 6. VERIFICAR OUTRAS TABELAS QUE PODEM ESTAR CAUSANDO PROBLEMAS
SELECT 
  'VERIFICAÇÃO GERAL:' as info,
  'Verifique se há problemas de performance' as instrucao;
