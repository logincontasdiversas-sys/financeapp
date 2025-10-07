-- =====================================================
-- VERIFICAR CONFIGURAÇÕES DE EMAIL NO SUPABASE
-- =====================================================

-- 1. VERIFICAR USUÁRIOS NÃO CONFIRMADOS
SELECT 
  'Usuários não confirmados:' as status,
  COUNT(*) as total
FROM auth.users 
WHERE email_confirmed_at IS NULL;

-- 2. VERIFICAR USUÁRIOS COM DATAS FUTURAS
SELECT 
  'Usuários com datas futuras:' as status,
  COUNT(*) as total
FROM auth.users 
WHERE created_at > NOW();

-- 3. VERIFICAR TOKENS DE CONFIRMAÇÃO
SELECT 
  email,
  created_at,
  confirmation_sent_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 Email enviado, aguardando confirmação'
    ELSE '❌ Nenhum email enviado'
  END as status
FROM auth.users 
WHERE email IN (
  'dmbusinessonlines@gmail.com',
  'login.contasdiversas@gmail.com',
  'will89.rmadrid@gmail.com',
  'will89.rmadrid@gmail.com'
)
ORDER BY created_at;

-- 4. VERIFICAR CONFIGURAÇÕES DE AUTH
SELECT 
  'Configurações de Auth:' as info,
  'Verifique manualmente no Dashboard > Authentication > Settings' as instrucao;

-- 5. CRIAR FUNÇÃO PARA FORÇAR ENVIO DE EMAIL
CREATE OR REPLACE FUNCTION forcar_envio_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
BEGIN
  -- Buscar usuário
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN '❌ Usuário não encontrado: ' || p_email;
  END IF;
  
  -- Gerar novo token
  v_token := encode(gen_random_bytes(32), 'base64');
  
  -- Atualizar com novo token e forçar envio
  UPDATE auth.users 
  SET 
    confirmation_token = v_token,
    confirmation_sent_at = NOW(),
    invited_at = NOW(),
    email_confirmed_at = NULL
  WHERE id = v_user_id;
  
  RETURN '✅ Token atualizado para: ' || p_email || ' (Token: ' || v_token || ')';
END;
$$;

-- 6. EXECUTAR PARA CADA USUÁRIO PROBLEMÁTICO
SELECT forcar_envio_email('dmbusinessonlines@gmail.com');
SELECT forcar_envio_email('login.contasdiversas@gmail.com');
SELECT forcar_envio_email('will89.rmadrid@gmail.com');

-- =====================================================
-- PRÓXIMOS PASSOS:
-- =====================================================
-- 1. Execute este script
-- 2. Verifique se os tokens foram atualizados
-- 3. Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/settings
-- 4. Verifique se "Enable email confirmations" está ATIVADO
-- 5. Verifique se "Site URL" está configurado como: https://financeapp.vercel.app
-- 6. Verifique se "Redirect URLs" inclui: https://financeapp.vercel.app/auth/callback
