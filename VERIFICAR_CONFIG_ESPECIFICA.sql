-- =====================================================
-- VERIFICAR CONFIGURAÇÕES ESPECÍFICAS DO SUPABASE
-- =====================================================

-- 1. VERIFICAR USUÁRIOS SEM CONFIRMAÇÃO
SELECT 
  'USUÁRIOS SEM CONFIRMAÇÃO:' as info,
  email,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  confirmation_sent_at,
  confirmation_token,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 2. VERIFICAR CONFIGURAÇÕES DE EMAIL (se possível)
SELECT 
  'CONFIGURAÇÕES DE EMAIL:' as info,
  'Verifique no Dashboard: Authentication > Settings > Email' as instrucao;

-- 3. VERIFICAR SE HÁ PROBLEMAS COM O EMAIL ESPECÍFICO
SELECT 
  'PROBLEMA ESPECÍFICO:' as info,
  email,
  CASE 
    WHEN email LIKE '%gmail.com' THEN '✅ Gmail - OK'
    WHEN email LIKE '%hotmail.com' THEN '✅ Hotmail - OK'
    WHEN email LIKE '%outlook.com' THEN '✅ Outlook - OK'
    ELSE '⚠️ Email personalizado'
  END as tipo_email,
  confirmation_sent_at,
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';

-- 4. CRIAR FUNÇÃO PARA TESTAR ENVIO
CREATE OR REPLACE FUNCTION testar_envio_email(p_email TEXT)
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
  
  -- Forçar reenvio
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

-- 5. TESTAR ENVIO
SELECT testar_envio_email('dmbusinessonlines@gmail.com');

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se há outros usuários sem confirmação
-- 3. Verifique as configurações de email no Dashboard
-- 4. Teste com email diferente se necessário
