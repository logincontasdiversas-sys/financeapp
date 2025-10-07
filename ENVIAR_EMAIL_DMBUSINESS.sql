-- =====================================================
-- ENVIAR EMAIL PARA dmbusinessonlines@gmail.com
-- =====================================================

-- 1. VERIFICAR STATUS ATUAL DO USUÁRIO
SELECT 
  'STATUS ATUAL:' as info,
  u.email,
  u.display_name,
  u.created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  u.email_confirmed_at,
  u.confirmation_sent_at,
  u.confirmation_token,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMADO'
    WHEN u.confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users u
WHERE u.email = 'dmbusinessonlines@gmail.com';

-- 2. FORÇAR REENVIO DE EMAIL
UPDATE auth.users 
SET 
  confirmation_token = encode(gen_random_bytes(32), 'base64'),
  confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
  updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
WHERE email = 'dmbusinessonlines@gmail.com';

-- 3. VERIFICAR SE FOI ENVIADO
SELECT 
  'APÓS REENVIO:' as info,
  u.email,
  u.confirmation_sent_at,
  u.confirmation_token,
  CASE 
    WHEN u.confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users u
WHERE email = 'dmbusinessonlines@gmail.com';

-- 4. CRIAR FUNÇÃO ESPECÍFICA PARA DMBUSINESS
CREATE OR REPLACE FUNCTION enviar_email_dmbusiness()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_resultado TEXT;
BEGIN
  -- Buscar usuário
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'dmbusinessonlines@gmail.com';
  
  IF v_user_id IS NULL THEN
    RETURN '❌ Usuário dmbusinessonlines@gmail.com não encontrado';
  END IF;
  
  -- Forçar reenvio
  UPDATE auth.users
  SET 
    confirmation_token = encode(gen_random_bytes(32), 'base64'),
    confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
    updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
  WHERE id = v_user_id;
  
  v_resultado := '✅ Email reenviado para: dmbusinessonlines@gmail.com';
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN '❌ Erro: ' || SQLERRM;
END;
$$;

-- 5. EXECUTAR FUNÇÃO
SELECT enviar_email_dmbusiness();

-- 6. VERIFICAR RESULTADO FINAL
SELECT 
  'RESULTADO FINAL:' as info,
  u.email,
  u.confirmation_sent_at,
  u.confirmation_token,
  CASE 
    WHEN u.confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO COM SUCESSO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status_final
FROM auth.users u
WHERE email = 'dmbusinessonlines@gmail.com';

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se o email foi enviado
-- 3. Verifique a pasta de spam do Gmail
-- 4. Se não chegar, verifique as configurações de email no Supabase
