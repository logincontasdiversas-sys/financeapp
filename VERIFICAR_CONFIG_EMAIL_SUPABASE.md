# 🚨 VERIFICAR CONFIGURAÇÕES DE EMAIL NO SUPABASE

## ❌ **PROBLEMA:** Email marcado como enviado mas não chegou

## ✅ **SOLUÇÕES:**

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

### 🔧 **2. VERIFICAR SMTP**

#### **Se usando SMTP personalizado:**
- ✅ **SMTP Host:** Configurado
- ✅ **SMTP Port:** 587 ou 465
- ✅ **SMTP User:** Email válido
- ✅ **SMTP Password:** Senha correta
- ✅ **SMTP Sender:** Email válido

#### **Se usando Supabase Free Email:**
- ✅ **Confirmar que não há SMTP configurado**
- ✅ **Usar email padrão do Supabase**

### 🔧 **3. VERIFICAR TEMPLATES**

#### **Authentication > Email Templates**

1. **✅ Confirm signup:** Ativo
2. **✅ Magic Link:** Ativo  
3. **✅ Change Email Address:** Ativo

### 🔧 **4. TESTAR COM EMAIL DIFERENTE**

#### **Execute no Supabase Dashboard:**

```sql
-- Testar com email diferente
SELECT forcar_reenvio_email('seu_email_pessoal@gmail.com');
```

### 🔧 **5. VERIFICAR LOGS**

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
6. **❌ Timestamp futuro (como no seu caso)**

### ✅ **SOLUÇÃO RÁPIDA:**

1. **Execute o script `CORRIGIR_TIMESTAMP_EMAIL.sql`**
2. **Verifique as configurações acima**
3. **Teste com um email diferente**
4. **Verifique a pasta de spam**

---

## 🎯 **PRÓXIMOS PASSOS:**

1. ✅ Execute o script de correção de timestamp
2. ✅ Verifique configurações no Dashboard
3. ✅ Teste com email diferente
4. ✅ Verifique pasta de spam
