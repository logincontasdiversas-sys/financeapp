-- =====================================================
-- CONVITE EM LOTE - MÚLTIPLOS USUÁRIOS
-- =====================================================

-- FUNÇÃO PARA CONVIDAR MÚLTIPLOS USUÁRIOS
CREATE OR REPLACE FUNCTION convidar_em_lote(
  emails TEXT[]
)
RETURNS TABLE (
  email TEXT,
  resultado TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_item TEXT;
  novo_id UUID;
  nome_usuario TEXT;
  resultado_item TEXT;
BEGIN
  -- Loop através de cada email
  FOREACH email_item IN ARRAY emails
  LOOP
    BEGIN
      -- Verificar se já existe
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_item) THEN
        resultado_item := '❌ Já existe';
        user_id := NULL;
      ELSE
        -- Gerar ID único
        novo_id := gen_random_uuid();
        nome_usuario := split_part(email_item, '@', 1);
        
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
          email_item,
          '',
          NULL,
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
          email_item,
          nome_usuario,
          FALSE,
          'app_only',
          'user',
          FALSE
        );
        
        resultado_item := '✅ Criado';
        user_id := novo_id;
      END IF;
      
      -- Retornar resultado para este email
      email := email_item;
      resultado := resultado_item;
      RETURN NEXT;
      
    EXCEPTION
      WHEN OTHERS THEN
        email := email_item;
        resultado := '❌ Erro: ' || SQLERRM;
        user_id := NULL;
        RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- =====================================================
-- COMO USAR:
-- =====================================================

-- 1. Execute o script para criar a função
-- 2. Use assim:

-- SELECT * FROM convidar_em_lote(ARRAY[
--   'usuario1@empresa.com',
--   'usuario2@empresa.com', 
--   'usuario3@empresa.com'
-- ]);

-- =====================================================
-- EXEMPLO PRÁTICO:
-- =====================================================

-- Convidar equipe de vendas:
-- SELECT * FROM convidar_em_lote(ARRAY[
--   'vendas@empresa.com',
--   'vendedor1@empresa.com',
--   'vendedor2@empresa.com',
--   'gerente.vendas@empresa.com'
-- ]);

-- =====================================================
-- VERIFICAR RESULTADOS:
-- =====================================================

-- Ver todos os convites enviados hoje:
-- SELECT 
--   u.email,
--   p.display_name,
--   u.created_at,
--   CASE 
--     WHEN u.email_confirmed_at IS NULL THEN 'Pendente'
--     ELSE 'Confirmado'
--   END as status
-- FROM auth.users u
-- JOIN profiles p ON u.id = p.user_id
-- WHERE u.created_at >= CURRENT_DATE
-- ORDER BY u.created_at DESC;

-- =====================================================
-- LIMPEZA (SE NECESSÁRIO):
-- =====================================================

-- Remover usuários não confirmados (CUIDADO!):
-- DELETE FROM profiles WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email_confirmed_at IS NULL 
--   AND created_at < NOW() - INTERVAL '7 days'
-- );
-- 
-- DELETE FROM auth.users 
-- WHERE email_confirmed_at IS NULL 
-- AND created_at < NOW() - INTERVAL '7 days';
