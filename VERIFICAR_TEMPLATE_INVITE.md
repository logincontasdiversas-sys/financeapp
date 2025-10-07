# 🔍 VERIFICAR TEMPLATE DE INVITE NO SUPABASE

## 🎯 **PROBLEMA IDENTIFICADO PELO UNIVERSITÁRIO**

O código está correto, mas o template "Invite user" pode não estar configurado no Supabase.

### 🔧 **VERIFICAR NO SUPABASE DASHBOARD**

#### **Authentication > Email Templates > Invite user**

1. **✅ Template ativo:** Verificar se está habilitado
2. **✅ Conteúdo do template:** Verificar se tem conteúdo
3. **✅ Variáveis:** Verificar se tem `{{ .ConfirmationURL }}`

### 🔧 **CONFIGURAR TEMPLATE SE NECESSÁRIO**

#### **Template Invite user:**

```html
<h2>Você foi convidado para o FinanceApp</h2>
<p>Olá!</p>
<p>Você foi convidado para acessar o FinanceApp.</p>
<p>Clique no link abaixo para confirmar sua conta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar Conta</a></p>
<p>Se você não solicitou este convite, ignore este email.</p>
```

### 🔧 **ALTERNATIVA: USAR TYPE 'SIGNUP'**

Se o template "Invite user" não funcionar, usar `type: 'signup'`:

```typescript
const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',  // Mudar de 'invite' para 'signup'
  email: newUser.email,
  options: {
    emailRedirectTo: window.location.origin + '/auth/callback'
  }
});
```

### 🔧 **VERIFICAR LOGS DE ERRO**

#### **No Supabase Dashboard:**
1. **Logs > Auth**
2. **Filtrar por:** `generateLink`, `invite`, `error`
3. **Verificar erros de template**

### 🎯 **PRÓXIMOS PASSOS**

1. ✅ Verificar template "Invite user" no Dashboard
2. ✅ Configurar template se necessário
3. ✅ Testar com `type: 'signup'` se não funcionar
4. ✅ Verificar logs de erro

**O problema é o template, não o código!** 🎯
