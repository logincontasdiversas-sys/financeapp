-- =====================================================
-- CORRIGIR TIMESTAMP E FORÇAR REENVIO DE EMAIL
-- =====================================================

-- 1. VERIFICAR STATUS ATUAL
SELECT 
  'STATUS ATUAL:' as info,
  email,
  confirmation_sent_at,
  created_at,
  CASE 
    WHEN confirmation_sent_at > NOW() THEN '⚠️ DATA FUTURA - PROBLEMA'
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';

-- 2. CORRIGIR TIMESTAMP PARA AGORA
UPDATE auth.users 
SET 
  confirmation_token = encode(gen_random_bytes(32), 'base64'),
  confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
  updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
WHERE email = 'dmbusinessonlines@gmail.com';

-- 3. VERIFICAR APÓS CORREÇÃO
SELECT 
  'APÓS CORREÇÃO:' as info,
  email,
  confirmation_sent_at,
  created_at,
  CASE 
    WHEN confirmation_sent_at > NOW() THEN '⚠️ AINDA FUTURA'
    WHEN confirmation_sent_at IS NOT NULL THEN '✅ EMAIL ENVIADO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email = 'dmbusinessonlines@gmail.com';

-- 4. CRIAR FUNÇÃO PARA FORÇAR REENVIO
CREATE OR REPLACE FUNCTION forcar_reenvio_email(p_email TEXT)
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
  
  v_resultado := '✅ Email forçado para: ' || p_email;
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN '❌ Erro: ' || SQLERRM;
END;
$$;

-- 5. EXECUTAR FUNÇÃO
SELECT forcar_reenvio_email('dmbusinessonlines@gmail.com');

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se o timestamp foi corrigido
-- 3. Verifique se o email foi enviado
-- 4. Se não chegar, verifique configurações de email no Supabase
