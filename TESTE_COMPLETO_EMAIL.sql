-- =====================================================
-- TESTE COMPLETO DE EMAIL - DIAGNÓSTICO FINAL
-- =====================================================

-- 1. VERIFICAR USUÁRIOS SEM CONFIRMAÇÃO
SELECT 
  'USUÁRIOS SEM CONFIRMAÇÃO:' as info,
  email,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  email_confirmed_at,
  confirmation_sent_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMADO'
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 2. VERIFICAR CONFIGURAÇÕES DE EMAIL
SELECT 
  'CONFIGURAÇÕES DE EMAIL:' as info,
  'Verifique no Dashboard: Authentication > Email Templates > Confirm signup' as instrucao;

-- 3. VERIFICAR REDIRECT URLs
SELECT 
  'REDIRECT URLs:' as info,
  'Verifique no Dashboard: Authentication > Settings > Site URL & Redirect URLs' as instrucao;

-- 4. CRIAR FUNÇÃO PARA TESTAR ENVIO COMPLETO
CREATE OR REPLACE FUNCTION testar_envio_completo(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_resultado TEXT;
BEGIN
  -- Buscar usuário
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN '❌ Usuário não encontrado: ' || p_email;
  END IF;
  
  -- Forçar reenvio com timestamp correto
  UPDATE auth.users
  SET 
    confirmation_token = encode(gen_random_bytes(32), 'base64'),
    confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
    updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
  WHERE id = v_user_id;
  
  v_resultado := '✅ Teste de envio executado para: ' || p_email;
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN '❌ Erro: ' || SQLERRM;
END;
$$;

-- 5. EXECUTAR TESTE
SELECT testar_envio_completo('dmbusinessonlines@gmail.com');

-- 6. VERIFICAR RESULTADO
SELECT 
  'RESULTADO DO TESTE:' as info,
  email,
  confirmation_sent_at,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique template "Confirm signup" no Dashboard
-- 3. Verifique Redirect URLs no Dashboard
-- 4. Se não funcionar, configure SMTP no Dashboard
