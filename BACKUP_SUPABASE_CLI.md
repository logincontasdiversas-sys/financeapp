# 💾 BACKUP VIA SUPABASE CLI

## 🔧 **INSTALAÇÃO DO SUPABASE CLI**

### **Windows:**
```bash
# Via Chocolatey
choco install supabase

# Via Scoop
scoop bucket add supabase https://github.com/supabase/cli.git
scoop install supabase

# Via npm
npm install -g supabase
```

### **macOS:**
```bash
# Via Homebrew
brew install supabase/tap/supabase

# Via npm
npm install -g supabase
```

### **Linux:**
```bash
# Via npm
npm install -g supabase

# Via curl
curl -fsSL https://supabase.com/install.sh | sh
```

## 🔧 **CONFIGURAÇÃO**

### **1. Login no Supabase:**
```bash
supabase login
```

### **2. Link do projeto:**
```bash
supabase link --project-ref [SEU_PROJECT_REF]
```

## 🔧 **BACKUP DAS TABELAS**

### **1. Backup completo do banco:**
```bash
# Backup completo
supabase db dump --data-only > backup_completo.sql

# Backup com schema e dados
supabase db dump > backup_completo_com_schema.sql
```

### **2. Backup de tabelas específicas:**
```bash
# Backup apenas das tabelas desnecessárias
supabase db dump --data-only --table kiwify_products --table kiwify_purchases --table kiwify_webhook_logs --table whatsapp_users --table profiles_backup --table budgets > backup_tabelas_desnecessarias.sql
```

### **3. Backup em formato CSV:**
```bash
# Para cada tabela individualmente
supabase db dump --data-only --table kiwify_products --format csv > kiwify_products.csv
supabase db dump --data-only --table kiwify_purchases --format csv > kiwify_purchases.csv
supabase db dump --data-only --table kiwify_webhook_logs --format csv > kiwify_webhook_logs.csv
supabase db dump --data-only --table whatsapp_users --format csv > whatsapp_users.csv
supabase db dump --data-only --table profiles_backup --format csv > profiles_backup.csv
supabase db dump --data-only --table budgets --format csv > budgets.csv
```

## 🔧 **RESTAURAR BACKUP**

### **1. Restaurar backup completo:**
```bash
supabase db reset --db-url [SUA_URL_DO_BANCO]
```

### **2. Restaurar tabelas específicas:**
```bash
# Restaurar apenas as tabelas de backup
psql [SUA_URL_DO_BANCO] -f backup_tabelas_desnecessarias.sql
```

## 🔧 **VERIFICAÇÃO**

### **1. Verificar tabelas existentes:**
```bash
supabase db dump --schema-only | grep "CREATE TABLE"
```

### **2. Verificar dados:**
```bash
supabase db dump --data-only --table [NOME_DA_TABELA]
```

## ⚠️ **IMPORTANTE**

- **Sempre faça backup antes de remover tabelas**
- **Teste a restauração em ambiente de desenvolvimento**
- **Mantenha os backups por pelo menos 30 dias**
- **Verifique se não há dados importantes antes de remover**
