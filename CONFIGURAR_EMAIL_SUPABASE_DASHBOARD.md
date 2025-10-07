# 📧 CONFIGURAR EMAIL NO SUPABASE DASHBOARD

## 🚨 **PROBLEMA IDENTIFICADO**
- Usuários criados com datas futuras (fuso horário Brasil)
- Emails não são enviados automaticamente
- Configurações de email podem estar incorretas

## ✅ **SOLUÇÕES IMEDIATAS**

### 1. **EXECUTAR SCRIPT SQL**
```sql
-- Execute o arquivo: CORRIGIR_FUSO_HORARIO_BRASIL.sql
-- Isso corrigirá as datas dos usuários existentes
```

### 2. **VERIFICAR CONFIGURAÇÕES NO DASHBOARD**

#### A. **Authentication Settings**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/settings
- Verifique se está configurado:

**✅ Configurações Obrigatórias:**
- **Enable email confirmations:** ✅ ATIVADO
- **Enable email change confirmations:** ✅ ATIVADO
- **Site URL:** `https://financeapp.vercel.app`
- **Redirect URLs:** 
  - `https://financeapp.vercel.app/auth/callback`
  - `https://financeapp.vercel.app/**`

#### B. **Email Templates**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/templates
- Verifique se está ativo:
- **Confirm signup:** ✅ ATIVADO
- **Magic Link:** ✅ ATIVADO

#### C. **SMTP Configuration (Se necessário)**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/settings
- Se emails não chegarem, configure SMTP personalizado

### 3. **TESTAR ENVIO DE EMAIL**

#### A. **Via Dashboard Supabase**
1. Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/auth/users
2. Clique em **"Add user"**
3. Selecione **"Send invitation"**
4. Digite o email: `teste@empresa.com`
5. Clique em **"Send invitation"**
6. Verifique se o email foi enviado

#### B. **Via SQL (Scripts criados)**
```sql
-- Convidar usuário individual
SELECT enviar_convite_brasil('usuario@empresa.com', 'Nome do Usuário');

-- Convidar múltiplos usuários
SELECT * FROM convidar_em_lote(ARRAY[
  'usuario1@empresa.com',
  'usuario2@empresa.com'
]);
```

### 4. **VERIFICAR LOGS**
- Acesse: https://supabase.com/dashboard/project/cibtvihaydjlsjjfytkt/logs
- Filtre por "auth" ou "email"
- Verifique se há erros de envio

## 🔧 **CONFIGURAÇÃO SMTP (SE NECESSÁRIO)**

### **Gmail SMTP:**
```
Host: smtp.gmail.com
Port: 587
Username: seu-email@gmail.com
Password: sua-senha-de-app
```

### **Outlook SMTP:**
```
Host: smtp-mail.outlook.com
Port: 587
Username: seu-email@outlook.com
Password: sua-senha
```

## 📋 **CHECKLIST DE VERIFICAÇÃO**

- [ ] Script SQL executado (CORRIGIR_FUSO_HORARIO_BRASIL.sql)
- [ ] Enable email confirmations: ✅ ATIVADO
- [ ] Site URL: `https://financeapp.vercel.app`
- [ ] Redirect URLs configuradas
- [ ] Email templates ativos
- [ ] Teste de envio via Dashboard funcionando
- [ ] Logs sem erros de email

## 🚨 **SE AINDA NÃO FUNCIONAR**

### **Alternativa 1: Envio Manual**
```typescript
// No AdminUsersManagement.tsx, usar:
const { data: inviteData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: newUser.email,
  options: {
    emailRedirectTo: 'https://financeapp.vercel.app/auth/callback',
  },
});
```

### **Alternativa 2: API Externa**
- Configurar SendGrid, Resend, ou outro serviço
- Implementar envio via API externa

## 📞 **SUPORTE**
Se nada funcionar, verificar:
1. Limites de email do Supabase (gratuito tem limites)
2. Configurações de DNS do domínio
3. Filtros de spam dos provedores de email
