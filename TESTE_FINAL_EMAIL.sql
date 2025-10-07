-- =====================================================
-- TESTE FINAL - VERIFICAR CONFIGURAÇÕES DE EMAIL
-- =====================================================

-- 1. VERIFICAR SE SMTP ESTÁ CONFIGURADO
SELECT 
  'VERIFICAÇÃO SMTP:' as info,
  'Verifique no Dashboard: Authentication > Settings > SMTP Settings' as instrucao;

-- 2. VERIFICAR USUÁRIOS SEM CONFIRMAÇÃO
SELECT 
  'USUÁRIOS SEM CONFIRMAÇÃO:' as info,
  email,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  confirmation_sent_at,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 3. FORÇAR REENVIO FINAL
UPDATE auth.users 
SET 
  confirmation_token = encode(gen_random_bytes(32), 'base64'),
  confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
  updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
WHERE email = 'dmbusinessonlines@gmail.com';

-- 4. VERIFICAR RESULTADO
SELECT 
  'RESULTADO FINAL:' as info,
  email,
  confirmation_sent_at,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';

-- =====================================================
-- INSTRUÇÕES FINAIS:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Se ainda não funcionar, configure SMTP no Dashboard
-- 3. Use senha de app do Gmail
-- 4. Verifique logs de erro no Supabase
