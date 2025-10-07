-- =====================================================
-- CORRIGIR FUSO HORÁRIO BRASIL - SUPABASE
-- =====================================================

-- PROBLEMA: Supabase está criando usuários com datas futuras
-- SOLUÇÃO: Corrigir para fuso horário do Brasil (UTC-3)

-- 1. VERIFICAR FUSO HORÁRIO ATUAL
SELECT 
  'Fuso horário atual:' as info,
  NOW() as utc_now,
  NOW() AT TIME ZONE 'America/Sao_Paulo' as brasilia_now;

-- 2. VERIFICAR USUÁRIOS COM DATAS PROBLEMÁTICAS
SELECT 
  email,
  created_at,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasilia,
  email_confirmed_at,
  CASE 
    WHEN created_at > NOW() THEN '❌ DATA FUTURA'
    WHEN email_confirmed_at IS NULL THEN '📧 PENDENTE CONFIRMAÇÃO'
    ELSE '✅ CONFIRMADO'
  END as status
FROM auth.users 
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com'
)
ORDER BY created_at;

-- 3. CORRIGIR DATAS PARA FUSO HORÁRIO BRASIL
UPDATE auth.users 
SET 
  created_at = (NOW() - INTERVAL '2 hours') AT TIME ZONE 'America/Sao_Paulo',
  updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
  invited_at = (NOW() - INTERVAL '2 hours') AT TIME ZONE 'America/Sao_Paulo',
  confirmation_sent_at = (NOW() - INTERVAL '1 hour') AT TIME ZONE 'America/Sao_Paulo'
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com'
);

-- 4. CORRIGIR DATAS DOS PROFILES
UPDATE profiles 
SET 
  created_at = (NOW() - INTERVAL '2 hours') AT TIME ZONE 'America/Sao_Paulo',
  updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com'
);

-- 5. VERIFICAR SE AS CORREÇÕES FUNCIONARAM
SELECT 
  'APÓS CORREÇÃO:' as status,
  email,
  created_at,
  created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasilia,
  email_confirmed_at
FROM auth.users 
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com'
)
ORDER BY created_at;

-- 6. CRIAR FUNÇÃO PARA ENVIAR CONVITES COM FUSO CORRETO
CREATE OR REPLACE FUNCTION enviar_convite_brasil(
  p_email TEXT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_nome TEXT;
  v_resultado TEXT;
BEGIN
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN '❌ Email já existe: ' || p_email;
  END IF;
  
  -- Gerar ID e nome
  v_user_id := gen_random_uuid();
  v_nome := COALESCE(p_display_name, split_part(p_email, '@', 1));
  
  -- Criar usuário com fuso horário correto
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
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    '',
    NULL, -- Não confirmado
    NOW() AT TIME ZONE 'America/Sao_Paulo', -- Fuso Brasil
    encode(gen_random_bytes(32), 'base64'),
    NOW() AT TIME ZONE 'America/Sao_Paulo', -- Fuso Brasil
    '{"provider": "email", "providers": ["email"]}',
    json_build_object('display_name', v_nome),
    NOW() AT TIME ZONE 'America/Sao_Paulo', -- Fuso Brasil
    NOW() AT TIME ZONE 'America/Sao_Paulo'  -- Fuso Brasil
  );
  
  -- Criar perfil
  INSERT INTO profiles (
    user_id,
    email,
    display_name,
    is_admin,
    access_type,
    role,
    onboarding_done,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    v_nome,
    FALSE,
    'app_only',
    'user',
    FALSE,
    NOW() AT TIME ZONE 'America/Sao_Paulo', -- Fuso Brasil
    NOW() AT TIME ZONE 'America/Sao_Paulo'  -- Fuso Brasil
  );
  
  v_resultado := '✅ Convite criado para: ' || p_email || ' (Fuso: Brasil)';
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN '❌ Erro: ' || SQLERRM;
END;
$$;

-- 7. TESTAR FUNÇÃO COM FUSO CORRETO
-- SELECT enviar_convite_brasil('teste@empresa.com', 'Usuário Teste');

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se as datas foram corrigidas para o fuso Brasil
-- 3. Os usuários devem receber emails automaticamente
-- 4. Se não receberem, verifique as configurações de email
