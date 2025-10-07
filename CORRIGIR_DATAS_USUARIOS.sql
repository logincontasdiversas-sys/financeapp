-- =====================================================
-- CORRIGIR DATAS ANÔMALAS DOS USUÁRIOS
-- =====================================================

-- Este script corrige as datas futuras que estão impedindo o envio de emails

-- 1. VERIFICAR USUÁRIOS COM DATAS FUTURAS
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  invited_at
FROM auth.users 
WHERE created_at > NOW()
ORDER BY created_at;

-- 2. CORRIGIR DATAS DOS USUÁRIOS ESPECÍFICOS
UPDATE auth.users 
SET 
  created_at = NOW() - INTERVAL '1 day',
  updated_at = NOW(),
  invited_at = NOW() - INTERVAL '1 day'
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com', 
  'will89.rmadrid@gmail.com'
);

-- 3. CORRIGIR DATAS DOS PROFILES CORRESPONDENTES
UPDATE profiles 
SET 
  created_at = NOW() - INTERVAL '1 day',
  updated_at = NOW()
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com'
);

-- 4. VERIFICAR SE AS CORREÇÕES FUNCIONARAM
SELECT 
  u.email,
  u.created_at,
  u.email_confirmed_at,
  p.display_name,
  p.created_at as profile_created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com'
)
ORDER BY u.created_at;

-- 5. CRIAR FUNÇÃO PARA REENVIAR CONVITES
CREATE OR REPLACE FUNCTION reenviar_convites_corrigidos()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  resultado TEXT := '';
BEGIN
  -- Para cada usuário não confirmado, gerar novo token
  FOR user_record IN 
    SELECT id, email FROM auth.users 
    WHERE email_confirmed_at IS NULL 
    AND email IN (
      'dmbusinessonlines@gmail.com',
      'login.contasdiversas@gmail.com',
      'will89.rmadrid@gmail.com'
    )
  LOOP
    -- Atualizar token de confirmação
    UPDATE auth.users 
    SET 
      confirmation_token = encode(gen_random_bytes(32), 'base64'),
      confirmation_sent_at = NOW(),
      invited_at = NOW()
    WHERE id = user_record.id;
    
    resultado := resultado || '✅ Token atualizado para: ' || user_record.email || E'\n';
  END LOOP;
  
  RETURN resultado;
END;
$$;

-- 6. EXECUTAR CORREÇÃO
SELECT reenviar_convites_corrigidos();

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard > SQL Editor
-- 2. Verifique se as datas foram corrigidas
-- 3. Os usuários devem receber emails de confirmação automaticamente
-- 4. Se não receberem, verifique as configurações de email no Dashboard
