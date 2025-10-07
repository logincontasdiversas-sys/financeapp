-- =====================================================
-- TESTAR EMAIL RÁPIDO - SUPABASE
-- =====================================================

-- 1. LIMPAR USUÁRIO DE TESTE ANTERIOR (se existir)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM auth.users WHERE email LIKE 'teste_email_%@empresa.com';
  IF test_user_id IS NOT NULL THEN
    DELETE FROM profiles WHERE user_id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    RAISE NOTICE 'Usuário de teste anterior removido: %', test_user_id;
  END IF;
END $$;

-- 2. CRIAR USUÁRIO DE TESTE COM EMAIL ÚNICO
SELECT enviar_convite_brasil(
  'teste_email_' || to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDDHH24MISS') || '@empresa.com', 
  'Usuário Teste Email'
) as resultado_teste;

-- 3. VERIFICAR SE O USUÁRIO FOI CRIADO
SELECT 
  'USUÁRIO DE TESTE CRIADO:' as info,
  u.email,
  u.created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  u.email_confirmed_at,
  u.confirmation_sent_at,
  u.confirmation_token,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMADO'
    WHEN u.confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO, AGUARDANDO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status_email
FROM auth.users u
WHERE u.email LIKE 'teste_email_%@empresa.com'
ORDER BY u.created_at DESC
LIMIT 1;

-- 4. SE EMAIL NÃO FOI ENVIADO, TENTAR REENVIAR
DO $$
DECLARE
  test_email TEXT;
  resultado TEXT;
BEGIN
  -- Buscar email de teste
  SELECT email INTO test_email 
  FROM auth.users 
  WHERE email LIKE 'teste_email_%@empresa.com'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF test_email IS NOT NULL THEN
    -- Tentar reenviar
    SELECT reenviar_email_confirmacao(test_email) INTO resultado;
    RAISE NOTICE 'Tentativa de reenvio: %', resultado;
  END IF;
END $$;

-- 5. VERIFICAR STATUS FINAL
SELECT 
  'STATUS FINAL:' as info,
  u.email,
  u.created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  u.email_confirmed_at,
  u.confirmation_sent_at,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMADO'
    WHEN u.confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO, AGUARDANDO'
    ELSE '❌ EMAIL NÃO ENVIADO - VERIFICAR CONFIGURAÇÕES'
  END as status_final
FROM auth.users u
WHERE u.email LIKE 'teste_email_%@empresa.com'
ORDER BY u.created_at DESC
LIMIT 1;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se o email foi enviado
-- 3. Se não foi enviado, verifique as configurações de email
-- 4. Verifique a pasta de spam do email de teste
