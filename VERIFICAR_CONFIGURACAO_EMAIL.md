# 🔧 VERIFICAÇÃO DE CONFIGURAÇÃO DE EMAIL

## ✅ **PASSOS PARA VERIFICAR NO SUPABASE DASHBOARD**

### 1. **Authentication Settings**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/settings
- Verifique se **"Enable email confirmations"** está **ATIVADO**
- Verifique se **"Enable email change confirmations"** está **ATIVADO**

### 2. **Site URL Configuration**
- **Site URL:** `https://financeapp.vercel.app`
- **Redirect URLs:** 
  - `https://financeapp.vercel.app/auth/callback`
  - `https://financeapp.vercel.app/**`

### 3. **Email Templates**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/templates
- Verifique se os templates estão configurados
- **Confirm signup** deve estar ativo

### 4. **SMTP Configuration (Se necessário)**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/settings
- Se não configurado, o Supabase usa o serviço gratuito (limitado)

## 🔍 **TESTE MANUAL**

### Teste 1: Criar usuário via Admin Panel
1. Acesse o painel admin
2. Crie um novo usuário
3. Verifique os logs no console
4. Verifique se o email foi enviado

### Teste 2: Verificar logs do Supabase
1. Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/logs
2. Filtre por "auth" ou "email"
3. Verifique se há erros de envio

## 🚨 **POSSÍVEIS PROBLEMAS**

### Problema 1: Rate Limit
- **Solução:** Aguardar ou configurar SMTP personalizado

### Problema 2: Email não configurado
- **Solução:** Configurar SMTP no Supabase

### Problema 3: URLs incorretas
- **Solução:** Atualizar Site URL e Redirect URLs

### Problema 4: Templates desabilitados
- **Solução:** Ativar templates de email

## 📧 **CONFIGURAÇÃO SMTP (OPCIONAL)**

Se o email gratuito não funcionar, configure SMTP:

1. **Gmail SMTP:**
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: `seu-email@gmail.com`
   - Password: `sua-senha-de-app`

2. **Outlook SMTP:**
   - Host: `smtp-mail.outlook.com`
   - Port: `587`
   - Username: `seu-email@outlook.com`
   - Password: `sua-senha`

## 🔧 **ALTERNATIVA: ENVIO MANUAL**

Se o Supabase não enviar automaticamente, implementar envio manual:

```typescript
// Enviar email manual via API
const response = await fetch('/api/send-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: newUser.email,
    displayName: newUser.display_name,
    inviteLink: magicLink.properties.email_otp_link
  })
});
```
