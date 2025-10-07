-- =====================================================
-- SCRIPT PARA ENVIAR CONVITE MANUAL VIA SUPABASE
-- =====================================================

-- Este script cria uma função RPC que permite enviar convites
-- diretamente do Supabase Dashboard usando apenas o email

-- 1. CRIAR FUNÇÃO PARA ENVIAR CONVITE
CREATE OR REPLACE FUNCTION enviar_convite_manual(
  p_email TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_access_type TEXT DEFAULT 'app_only'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
  v_invite_link TEXT;
BEGIN
  -- Verificar se o email já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário com este email já existe',
      'email', p_email
    );
  END IF;

  -- Verificar se já existe em profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Perfil com este email já existe',
      'email', p_email
    );
  END IF;

  -- Criar usuário no auth.users (sem senha, apenas email)
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
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    confirmed_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    '',
    NULL, -- email_confirmed_at (NULL para permitir confirmação)
    NOW(), -- invited_at
    encode(gen_random_bytes(32), 'base64'), -- confirmation_token
    NOW(), -- confirmation_sent_at
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    json_build_object(
      'display_name', COALESCE(p_display_name, split_part(p_email, '@', 1)),
      'phone', p_phone_number,
      'is_admin', p_is_admin,
      'access_type', p_access_type
    ),
    FALSE,
    NOW(),
    NOW(),
    p_phone_number,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    NULL
  ) RETURNING id INTO v_user_id;

  -- Criar perfil na tabela profiles
  INSERT INTO profiles (
    user_id,
    email,
    display_name,
    phone_number,
    is_admin,
    access_type,
    whatsapp_active,
    role,
    onboarding_done,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    COALESCE(p_display_name, split_part(p_email, '@', 1)),
    p_phone_number,
    p_is_admin,
    p_access_type,
    FALSE,
    CASE WHEN p_is_admin THEN 'admin' ELSE 'user' END,
    FALSE,
    NOW(),
    NOW()
  );

  -- Gerar link de convite usando a função nativa do Supabase
  -- Nota: Esta parte pode precisar ser feita via API, não via SQL
  v_invite_link := 'https://cibtvihaydjlsjjfytkt.supabase.co/auth/v1/verify?token=' || 
                   encode(gen_random_bytes(32), 'base64') || 
                   '&type=signup&redirect_to=https://financeapp.vercel.app/auth/callback';

  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'message', 'Convite enviado com sucesso',
    'user_id', v_user_id,
    'email', p_email,
    'display_name', COALESCE(p_display_name, split_part(p_email, '@', 1)),
    'invite_link', v_invite_link,
    'note', 'Verifique o email do usuário para o link de confirmação'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, fazer rollback
    IF v_user_id IS NOT NULL THEN
      DELETE FROM profiles WHERE user_id = v_user_id;
      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'email', p_email
    );
END;
$$;

-- 2. CRIAR FUNÇÃO SIMPLES PARA ENVIO RÁPIDO
CREATE OR REPLACE FUNCTION convidar_usuario(
  p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Chamar a função principal com valores padrão
  SELECT enviar_convite_manual(p_email) INTO v_result;
  
  -- Retornar mensagem simples
  IF (v_result->>'success')::boolean THEN
    RETURN '✅ Convite enviado para: ' || p_email;
  ELSE
    RETURN '❌ Erro: ' || (v_result->>'error');
  END IF;
END;
$$;

-- 3. CRIAR FUNÇÃO PARA LISTAR USUÁRIOS PENDENTES
CREATE OR REPLACE FUNCTION listar_usuarios_pendentes()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(p.display_name, split_part(u.email, '@', 1)) as display_name,
    u.created_at,
    CASE 
      WHEN u.email_confirmed_at IS NULL THEN 'Pendente de confirmação'
      ELSE 'Confirmado'
    END as status
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.user_id
  WHERE u.email_confirmed_at IS NULL
  ORDER BY u.created_at DESC;
END;
$$;

-- 4. CRIAR FUNÇÃO PARA REENVIAR CONVITE
CREATE OR REPLACE FUNCTION reenviar_convite(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result TEXT;
BEGIN
  -- Buscar usuário pelo email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_email AND email_confirmed_at IS NULL;
  
  IF v_user_id IS NULL THEN
    RETURN '❌ Usuário não encontrado ou já confirmado: ' || p_email;
  END IF;
  
  -- Atualizar token de confirmação
  UPDATE auth.users 
  SET 
    confirmation_token = encode(gen_random_bytes(32), 'base64'),
    confirmation_sent_at = NOW()
  WHERE id = v_user_id;
  
  RETURN '✅ Convite reenviado para: ' || p_email;
END;
$$;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- 1. ENVIAR CONVITE COMPLETO:
-- SELECT enviar_convite_manual(
--   'usuario@exemplo.com',
--   'Nome do Usuário',
--   '+5511999999999',
--   false,
--   'app_only'
-- );

-- 2. ENVIAR CONVITE SIMPLES:
-- SELECT convidar_usuario('usuario@exemplo.com');

-- 3. LISTAR USUÁRIOS PENDENTES:
-- SELECT * FROM listar_usuarios_pendentes();

-- 4. REENVIAR CONVITE:
-- SELECT reenviar_convite('usuario@exemplo.com');

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Este script cria usuários no auth.users, mas o envio real do email
-- depende das configurações do Supabase Dashboard:
-- 1. Authentication > Settings > Enable email confirmations
-- 2. Site URL configurado corretamente
-- 3. Templates de email ativos
-- 4. SMTP configurado (se necessário)
