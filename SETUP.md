# 🚀 Configuração do FinanceApp

## ⚠️ Problema: Tela Branca

O erro que você está vendo é porque as variáveis de ambiente do Supabase não estão configuradas.

## 🔧 Solução Passo a Passo

### 1. Criar arquivo `.env`

Crie um arquivo chamado `.env` na raiz do projeto (mesmo nível do `package.json`) com o seguinte conteúdo:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Obter as credenciais do Supabase

#### Opção A: Se você já tem um projeto Supabase
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

#### Opção B: Criar um novo projeto Supabase
1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"**
3. Faça login/cadastro
4. Clique em **"New Project"**
5. Escolha uma organização
6. Preencha:
   - **Name**: FinanceApp
   - **Database Password**: (escolha uma senha forte)
   - **Region**: escolha a mais próxima (ex: South America - São Paulo)
7. Clique em **"Create new project"**
8. Aguarde a criação (2-3 minutos)
9. Vá em **Settings** → **API** e copie as credenciais

### 3. Configurar o banco de dados

Após criar o projeto, você precisa executar as migrações:

#### Opção A: Via Supabase CLI (Recomendado)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar o projeto
supabase link --project-ref YOUR_PROJECT_ID

# Executar migrações
supabase db push
```

#### Opção B: Via Dashboard (Manual)
1. Acesse o **SQL Editor** no dashboard do Supabase
2. Execute as migrações uma por uma (arquivos em `supabase/migrations/`)
3. Comece com o arquivo mais antigo: `20250904202938_ef8c0be9-4749-4247-9eb1-a0f7d2b41ff0.sql`

### 4. Reiniciar o servidor

```bash
# Parar o servidor (Ctrl+C)
# Reiniciar
npm run dev
```

## 🎯 Resultado Esperado

Após configurar corretamente, você deve ver:
- ✅ Aplicação carregando normalmente
- ✅ Tela de login/cadastro
- ✅ Sem erros no console

## 🔍 Verificação

Para verificar se está funcionando:
1. Abra o console do navegador (F12)
2. Não deve haver erros de "Supabase configuration missing"
3. A aplicação deve carregar a tela de autenticação

## 📞 Suporte

Se ainda tiver problemas:
1. Verifique se o arquivo `.env` está na raiz do projeto
2. Verifique se as variáveis começam com `VITE_`
3. Verifique se não há espaços extras nas credenciais
4. Reinicie o servidor após alterar o `.env`

## 🚀 Próximos Passos

Após resolver a configuração:
1. Crie uma conta na aplicação
2. Explore o dashboard
3. Teste as funcionalidades de receitas/despesas
4. Configure categorias e bancos
