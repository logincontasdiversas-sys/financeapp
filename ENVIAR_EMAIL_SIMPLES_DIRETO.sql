-- =====================================================
-- ENVIAR EMAIL SIMPLES - EXECUTAR DIRETAMENTE
-- =====================================================

-- 1. VERIFICAR USUÁRIO
SELECT 
  email,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  email_confirmed_at,
  confirmation_sent_at
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';

-- 2. FORÇAR REENVIO
UPDATE auth.users 
SET 
  confirmation_token = encode(gen_random_bytes(32), 'base64'),
  confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
  updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
WHERE email = 'dmbusinessonlines@gmail.com';

-- 3. VERIFICAR RESULTADO
SELECT 
  email,
  confirmation_sent_at,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';
