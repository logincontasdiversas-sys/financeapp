# 🚨 CONFIGURAR EMAIL SUPABASE - URGENTE

## ❌ **PROBLEMA:** Emails de cadastro não estão sendo enviados

## ✅ **SOLUÇÃO:** Verificar e corrigir configurações

### 🔧 **1. VERIFICAR NO SUPABASE DASHBOARD**

#### **Authentication > Settings > Email**

1. **✅ Email confirmations:** `ENABLED`
2. **✅ Email change confirmations:** `ENABLED` 
3. **✅ Email OTP confirmations:** `ENABLED`

#### **Site URL & Redirect URLs**

1. **Site URL:** `https://seu-dominio.vercel.app`
2. **Redirect URLs:** 
   - `https://seu-dominio.vercel.app/auth/callback`
   - `https://seu-dominio.vercel.app/dashboard`

### 🔧 **2. VERIFICAR SMTP (SE CONFIGURADO)**

#### **Se usando SMTP personalizado:**
- ✅ **SMTP Host:** Configurado
- ✅ **SMTP Port:** 587 ou 465
- ✅ **SMTP User:** Email válido
- ✅ **SMTP Password:** Senha correta
- ✅ **SMTP Sender:** Email válido

#### **Se usando Supabase Free Email:**
- ✅ **Confirmar que não há SMTP configurado**
- ✅ **Usar email padrão do Supabase**

### 🔧 **3. VERIFICAR TEMPLATES DE EMAIL**

#### **Authentication > Email Templates**

1. **✅ Confirm signup:** Ativo
2. **✅ Magic Link:** Ativo  
3. **✅ Change Email Address:** Ativo

### 🔧 **4. TESTAR CONFIGURAÇÃO**

#### **Execute no Supabase Dashboard:**

```sql
-- Verificar usuários sem confirmação
SELECT 
  email,
  created_at,
  email_confirmed_at,
  confirmation_sent_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMADO'
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 ENVIADO'
    ELSE '❌ NÃO ENVIADO'
  END as status
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;
```

### 🔧 **5. REENVIAR EMAIL MANUALMENTE**

#### **Execute no Supabase Dashboard:**

```sql
-- Reenviar email para usuário específico
SELECT reenviar_email_confirmacao('email_do_usuario@exemplo.com');
```

### 🔧 **6. VERIFICAR LOGS**

#### **No Supabase Dashboard:**
1. **Logs > Auth**
2. **Filtrar por:** `signup`, `confirmation`
3. **Verificar erros de envio**

### 🚨 **PROBLEMAS COMUNS:**

1. **❌ Site URL incorreto**
2. **❌ SMTP mal configurado**
3. **❌ Email confirmations desabilitado**
4. **❌ Redirect URLs incorretos**
5. **❌ Spam/Quarentena do email**

### ✅ **SOLUÇÃO RÁPIDA:**

1. **Execute o script `DIAGNOSTICAR_EMAIL_CADASTRO.sql`**
2. **Verifique as configurações acima**
3. **Teste com um email diferente**
4. **Verifique a pasta de spam**

---

## 🎯 **PRÓXIMOS PASSOS:**

1. ✅ Execute o script de diagnóstico
2. ✅ Verifique configurações no Dashboard
3. ✅ Teste com email diferente
4. ✅ Verifique pasta de spam