# 🔍 VERIFICAR TEMPLATE "CONFIRM SIGNUP"

## 🎯 **PROBLEMA IDENTIFICADO PELO UNIVERSITÁRIO**

O convite manual funciona, mas o automático não. Isso indica problema no template "Confirm signup".

### 🔧 **VERIFICAR NO SUPABASE DASHBOARD**

#### **Authentication > Email Templates > Confirm signup**

1. **✅ Template ativo:** Verificar se está habilitado (toggle verde)
2. **✅ Conteúdo do template:** Verificar se tem HTML no corpo
3. **✅ Variáveis:** Verificar se tem `{{ .ConfirmationURL }}`

### 🔧 **CONFIGURAR TEMPLATE SE NECESSÁRIO**

#### **Template Confirm signup:**

```html
<h2>Confirme sua conta no FinanceApp</h2>
<p>Olá!</p>
<p>Clique no link abaixo para confirmar sua conta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar Conta</a></p>
<p>Se você não criou esta conta, ignore este email.</p>
```

### 🔧 **VERIFICAR REDIRECT URLs**

#### **Authentication > Settings > Site URL & Redirect URLs**

1. **✅ Site URL:** `https://seu-dominio.vercel.app`
2. **✅ Redirect URLs:** 
   - `https://seu-dominio.vercel.app/auth/callback`
   - `https://seu-dominio.vercel.app/dashboard`

### 🔧 **VERIFICAR CÓDIGO**

#### **createUser deve ter:**
```typescript
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: newUserEmail,
  email_confirm: false  // ← CRÍTICO: deve ser false
});
```

#### **generateLink deve ter:**
```typescript
const { data, error } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',  // ← CRÍTICO: deve ser 'signup'
  email: newUserEmail,
  options: {
    redirectTo: 'https://seu-dominio.vercel.app/auth/callback'  // ← CRÍTICO: deve estar nas Redirect URLs
  }
});
```

### 🎯 **CHECKLIST RÁPIDO**

- ✅ Template "Confirm signup" ativo e preenchido
- ✅ RedirectTo está entre as Redirect URLs
- ✅ createUser não está passando email_confirm: true
- ✅ Está usando type: 'signup'
- ✅ Teste criando usuário pelo formulário de signup do Supabase

### 🚨 **SE AINDA NÃO FUNCIONAR**

1. **Verificar logs de erro** no Supabase Dashboard
2. **Testar com email diferente**
3. **Verificar se SMTP está configurado**
4. **Usar Supabase CLI para envio manual**

**O problema é quase certamente o template "Confirm signup"!** 🎯

