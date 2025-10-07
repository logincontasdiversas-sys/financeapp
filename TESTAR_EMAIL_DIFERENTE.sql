-- =====================================================
-- TESTAR EMAIL COM ENDEREÇO DIFERENTE
-- =====================================================

-- 1. CRIAR USUÁRIO DE TESTE COM EMAIL DIFERENTE
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste_email_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '@gmail.com',
  '',
  NULL,
  NOW() AT TIME ZONE 'America/Sao_Paulo',
  encode(gen_random_bytes(32), 'base64'),
  NOW() AT TIME ZONE 'America/Sao_Paulo',
  '{"provider": "email", "providers": ["email"]}',
  json_build_object('display_name', 'Usuário Teste'),
  NOW() AT TIME ZONE 'America/Sao_Paulo',
  NOW() AT TIME ZONE 'America/Sao_Paulo'
);

-- 2. VERIFICAR SE O USUÁRIO FOI CRIADO
SELECT 
  'USUÁRIO DE TESTE CRIADO:' as info,
  email,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  confirmation_sent_at,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email LIKE 'teste_email_%@gmail.com'
ORDER BY created_at DESC
LIMIT 1;

-- 3. CRIAR PERFIL PARA O USUÁRIO DE TESTE
INSERT INTO profiles (
  user_id,
  email,
  display_name,
  is_admin,
  access_type,
  role,
  onboarding_done
) 
SELECT 
  u.id,
  u.email,
  'Usuário Teste',
  FALSE,
  'app_only',
  'user',
  FALSE
FROM auth.users u
WHERE u.email LIKE 'teste_email_%@gmail.com'
ORDER BY u.created_at DESC
LIMIT 1;

-- 4. VERIFICAR SE O EMAIL FOI ENVIADO
SELECT 
  'VERIFICAÇÃO FINAL:' as info,
  u.email,
  u.confirmation_sent_at,
  p.display_name,
  CASE 
    WHEN u.confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email LIKE 'teste_email_%@gmail.com'
ORDER BY u.created_at DESC
LIMIT 1;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se o email de teste foi enviado
-- 3. Se não foi enviado, o problema é nas configurações do Supabase
-- 4. Se foi enviado, o problema é específico do email dmbusinessonlines@gmail.com
