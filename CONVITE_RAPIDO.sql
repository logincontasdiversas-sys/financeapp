-- =====================================================
-- CONVITE RÁPIDO - USO DIRETO NO SUPABASE DASHBOARD
-- =====================================================

-- FUNÇÃO SIMPLES PARA CONVIDAR USUÁRIO
CREATE OR REPLACE FUNCTION convidar_email(
  email_usuario TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  novo_id UUID;
  nome_usuario TEXT;
BEGIN
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_usuario) THEN
    RETURN '❌ Email já existe: ' || email_usuario;
  END IF;
  
  -- Gerar ID único
  novo_id := gen_random_uuid();
  nome_usuario := split_part(email_usuario, '@', 1);
  
  -- Criar usuário no auth.users
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
    novo_id,
    'authenticated',
    'authenticated',
    email_usuario,
    '',
    NULL, -- Não confirmado ainda
    NOW(),
    encode(gen_random_bytes(32), 'base64'),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    json_build_object('display_name', nome_usuario),
    NOW(),
    NOW()
  );
  
  -- Criar perfil
  INSERT INTO profiles (
    user_id,
    email,
    display_name,
    is_admin,
    access_type,
    role,
    onboarding_done
  ) VALUES (
    novo_id,
    email_usuario,
    nome_usuario,
    FALSE,
    'app_only',
    'user',
    FALSE
  );
  
  RETURN '✅ Convite criado para: ' || email_usuario || ' (ID: ' || novo_id || ')';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN '❌ Erro: ' || SQLERRM;
END;
$$;

-- =====================================================
-- COMO USAR:
-- =====================================================

-- 1. Copie e cole este script no Supabase Dashboard > SQL Editor
-- 2. Execute o script para criar a função
-- 3. Use a função assim:

-- SELECT convidar_email('usuario@exemplo.com');

-- =====================================================
-- EXEMPLOS DE USO:
-- =====================================================

-- Convidar um usuário:
-- SELECT convidar_email('joao@empresa.com');

-- Convidar múltiplos usuários:
-- SELECT convidar_email('maria@empresa.com');
-- SELECT convidar_email('pedro@empresa.com');
-- SELECT convidar_email('ana@empresa.com');

-- =====================================================
-- VERIFICAR RESULTADOS:
-- =====================================================

-- Ver usuários criados:
-- SELECT email, created_at, email_confirmed_at 
-- FROM auth.users 
-- WHERE email LIKE '%@empresa.com' 
-- ORDER BY created_at DESC;

-- Ver perfis criados:
-- SELECT p.email, p.display_name, p.role, p.created_at
-- FROM profiles p
-- JOIN auth.users u ON p.user_id = u.id
-- WHERE u.email_confirmed_at IS NULL
-- ORDER BY p.created_at DESC;
