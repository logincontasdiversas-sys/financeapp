-- =====================================================
-- VERIFICAR STATUS ADMIN DO USUÁRIO ATUAL
-- =====================================================

-- 1. VERIFICAR DADOS DO USUÁRIO ATUAL
SELECT 
  'USUÁRIO ATUAL:' as info,
  u.id,
  u.email,
  u.email_confirmed_at,
  p.display_name,
  p.is_admin,
  p.role,
  p.onboarding_done,
  CASE 
    WHEN p.is_admin = true THEN '✅ É ADMIN'
    WHEN p.role = 'admin' THEN '✅ É ADMIN (por role)'
    ELSE '❌ NÃO É ADMIN'
  END as status_admin
FROM auth.users u
JOIN profiles p ON u.id = p.user_id
WHERE u.id = '42d66a40-896f-4b85-9926-92a6c27ce4f4';

-- 2. VERIFICAR TODOS OS ADMINS DO SISTEMA
SELECT 
  'TODOS OS ADMINS:' as info,
  p.user_id,
  p.email,
  p.display_name,
  p.is_admin,
  p.role,
  '✅ ADMIN' as status
FROM profiles p
WHERE p.is_admin = true OR p.role = 'admin'
ORDER BY p.display_name;

-- 3. VERIFICAR SE HÁ PROBLEMAS DE SINCRONIZAÇÃO
SELECT 
  'PROBLEMAS DE SINCRONIZAÇÃO:' as info,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN is_admin IS NULL THEN 1 END) as is_admin_null,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as role_null,
  COUNT(CASE WHEN is_admin = true OR role = 'admin' THEN 1 END) as total_admins
FROM profiles;

-- 4. CORRIGIR DADOS INCOMPLETOS (SE NECESSÁRIO)
UPDATE profiles 
SET 
  is_admin = COALESCE(is_admin, FALSE),
  role = COALESCE(role, 'user')
WHERE is_admin IS NULL OR role IS NULL;

-- 5. VERIFICAR APÓS CORREÇÃO
SELECT 
  'APÓS CORREÇÃO:' as info,
  p.user_id,
  p.email,
  p.is_admin,
  p.role,
  CASE 
    WHEN p.is_admin = true OR p.role = 'admin' THEN '✅ ADMIN'
    ELSE '❌ USUÁRIO'
  END as status_final
FROM profiles p
WHERE p.user_id = '42d66a40-896f-4b85-9926-92a6c27ce4f4';
