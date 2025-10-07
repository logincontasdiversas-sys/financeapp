-- =====================================================
-- DIAGNOSTICAR EMAIL DE CADASTRO NÃO ENVIADO
-- =====================================================

-- 1. VERIFICAR USUÁRIOS RECÉM-CRIADOS (últimas 24h)
SELECT 
  'USUÁRIOS RECÉM-CRIADOS:' as info,
  u.id,
  u.email,
  u.created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  u.email_confirmed_at,
  u.confirmation_sent_at,
  u.confirmation_token,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMADO'
    WHEN u.confirmation_sent_at IS NOT NULL THEN '📧 EMAIL ENVIADO, AGUARDANDO'
    ELSE '❌ EMAIL NÃO ENVIADO'
  END as status_email,
  p.display_name,
  p.is_admin
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;

-- 2. VERIFICAR CONFIGURAÇÕES DE EMAIL NO SUPABASE
SELECT 
  'CONFIGURAÇÕES DE EMAIL:' as info,
  'Verifique no Dashboard: Authentication > Settings > Email' as instrucao;

-- 3. VERIFICAR USUÁRIOS COM EMAIL NÃO CONFIRMADO
SELECT 
  'USUÁRIOS SEM CONFIRMAÇÃO:' as info,
  u.email,
  u.created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil,
  u.confirmation_sent_at,
  u.confirmation_token,
  CASE 
    WHEN u.confirmation_sent_at IS NULL THEN '❌ NUNCA ENVIADO'
    WHEN u.confirmation_sent_at < u.created_at THEN '⚠️ ENVIADO ANTES DA CRIAÇÃO'
    ELSE '📧 ENVIADO APÓS CRIAÇÃO'
  END as status_envio
FROM auth.users u
WHERE u.email_confirmed_at IS NULL
ORDER BY u.created_at DESC;

-- 4. VERIFICAR TOKENS DE CONFIRMAÇÃO
SELECT 
  'TOKENS DE CONFIRMAÇÃO:' as info,
  u.email,
  LENGTH(u.confirmation_token) as token_length,
  u.confirmation_sent_at,
  CASE 
    WHEN u.confirmation_token IS NULL THEN '❌ SEM TOKEN'
    WHEN LENGTH(u.confirmation_token) < 10 THEN '⚠️ TOKEN MUITO CURTO'
    ELSE '✅ TOKEN OK'
  END as token_status
FROM auth.users u
WHERE u.email_confirmed_at IS NULL
ORDER BY u.created_at DESC;

-- 5. CRIAR FUNÇÃO PARA REENVIAR EMAIL DE CONFIRMAÇÃO
CREATE OR REPLACE FUNCTION reenviar_email_confirmacao(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_confirmation_token TEXT;
BEGIN
  -- Buscar usuário
  SELECT id, confirmation_token
  INTO v_user_id, v_confirmation_token
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN '❌ Usuário não encontrado: ' || p_email;
  END IF;

  -- Gerar novo token se necessário
  IF v_confirmation_token IS NULL THEN
    v_confirmation_token := encode(gen_random_bytes(32), 'base64');
  END IF;

  -- Atualizar dados para forçar reenvio
  UPDATE auth.users
  SET 
    confirmation_token = v_confirmation_token,
    confirmation_sent_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
    updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
  WHERE id = v_user_id;

  RETURN '✅ Email de confirmação reenviado para: ' || p_email;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '❌ Erro ao reenviar email: ' || SQLERRM;
END;
$$;

-- 6. TESTAR REENVIO PARA USUÁRIO ESPECÍFICO
-- SELECT reenviar_email_confirmacao('seu_email@exemplo.com');

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no Supabase Dashboard
-- 2. Verifique se há usuários com email não confirmado
-- 3. Use a função reenviar_email_confirmacao('email') para reenviar
-- 4. Verifique as configurações de email no Supabase Dashboard
