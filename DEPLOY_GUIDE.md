# 🚀 Guia de Deploy - FinanceApp

## 📋 Pré-requisitos

1. **Conta no GitHub** (gratuita)
2. **Conta no Vercel** (gratuita)
3. **Projeto Supabase** configurado
4. **Código funcionando** localmente

## 🌟 Opção 1: VERCEL (Recomendado)

### Passo 1: Preparar o Código

1. **Subir para GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

### Passo 2: Configurar Vercel

1. **Acesse:** https://vercel.com
2. **Faça login** com GitHub
3. **Clique em:** "New Project"
4. **Importe** seu repositório
5. **Configure as variáveis:**
   - `VITE_SUPABASE_URL` = URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` = Chave anônima do Supabase

### Passo 3: Deploy Automático

- ✅ **Deploy automático** a cada push
- ✅ **HTTPS automático**
- ✅ **CDN global**
- ✅ **Domínio personalizado** (ex: `seuapp.vercel.app`)

## 🌟 Opção 2: NETLIFY

### Passo 1: Preparar o Código
```bash
# Mesmo processo do GitHub acima
```

### Passo 2: Configurar Netlify

1. **Acesse:** https://netlify.com
2. **Faça login** com GitHub
3. **Clique em:** "New site from Git"
4. **Configure:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment variables: Adicione as variáveis do Supabase

## 🌟 Opção 3: SUPABASE HOSTING

### Passo 1: Configurar Supabase

1. **Acesse:** https://supabase.com/dashboard
2. **Vá em:** "Settings" > "Hosting"
3. **Conecte** seu repositório GitHub
4. **Configure** as variáveis de ambiente

## 🔧 Configurações Importantes

### Variáveis de Ambiente Necessárias:
```env
VITE_SUPABASE_URL=https://seuprojeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### Build Command:
```bash
npm run build
```

### Output Directory:
```
dist
```

## 🚀 Comandos Úteis

### Testar Build Localmente:
```bash
npm run build
npm run preview
```

### Verificar se está funcionando:
```bash
# Acesse: http://localhost:4173
```

## 🔒 Segurança

### ✅ O que é seguro:
- `VITE_SUPABASE_URL` - Pode ser público
- `VITE_SUPABASE_ANON_KEY` - Pode ser público (tem RLS)

### ❌ O que NÃO deve ser público:
- Chaves de serviço do Supabase
- Senhas de banco de dados
- Tokens privados

## 📱 PWA (Progressive Web App)

Seu app já está configurado como PWA:
- ✅ **Manifest.json** configurado
- ✅ **Service Worker** ativo
- ✅ **Instalável** no celular/desktop
- ✅ **Funciona offline** (com cache)

## 🎯 Próximos Passos

1. **Deploy** em uma das plataformas
2. **Teste** todas as funcionalidades
3. **Configure** domínio personalizado (opcional)
4. **Monitore** performance e erros
5. **Configure** backup automático

## 🆘 Troubleshooting

### Erro de Build:
```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erro de Variáveis:
- Verifique se as variáveis estão corretas
- Confirme se o Supabase está ativo
- Teste localmente primeiro

### Erro de CORS:
- Configure CORS no Supabase
- Adicione domínio na lista de permitidos

## 📞 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Supabase Docs:** https://supabase.com/docs
