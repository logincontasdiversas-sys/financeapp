# 💾 BACKUP VIA PGBACKREST (PRODUÇÃO)

## 🔧 **INSTALAÇÃO DO PGBACKREST**

### **Ubuntu/Debian:**
```bash
# Adicionar repositório
wget -O - https://repo.pgbackrest.org/conf/pgbackrest.conf | sudo tee /etc/apt/sources.list.d/pgbackrest.list
wget -qO - https://repo.pgbackrest.org/conf/pgbackrest.gpg | sudo apt-key add -

# Instalar
sudo apt-get update
sudo apt-get install pgbackrest
```

### **CentOS/RHEL:**
```bash
# Adicionar repositório
sudo yum install -y https://repo.pgbackrest.org/yum/pgbackrest-2.47-1.el7.x86_64.rpm
```

## 🔧 **CONFIGURAÇÃO**

### **1. Arquivo de configuração:**
```bash
sudo nano /etc/pgbackrest/pgbackrest.conf
```

### **2. Configuração básica:**
```ini
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=2
repo1-retention-incr=2

[db]
pg1-path=/var/lib/postgresql/data
pg1-port=5432
pg1-database=postgres
```

## 🔧 **BACKUP DAS TABELAS**

### **1. Backup completo:**
```bash
# Backup completo
sudo -u postgres pgbackrest --stanza=db backup

# Backup incremental
sudo -u postgres pgbackrest --stanza=db backup --type=incr
```

### **2. Backup de tabelas específicas:**
```bash
# Backup apenas das tabelas desnecessárias
sudo -u postgres pgbackrest --stanza=db backup --table=kiwify_products --table=kiwify_purchases --table=kiwify_webhook_logs --table=whatsapp_users --table=profiles_backup --table=budgets
```

### **3. Verificar backups:**
```bash
# Listar backups
sudo -u postgres pgbackrest --stanza=db info

# Verificar backup específico
sudo -u postgres pgbackrest --stanza=db info --set=20231201-120000
```

## 🔧 **RESTAURAR BACKUP**

### **1. Restaurar backup completo:**
```bash
# Parar PostgreSQL
sudo systemctl stop postgresql

# Restaurar backup
sudo -u postgres pgbackrest --stanza=db restore --set=20231201-120000

# Iniciar PostgreSQL
sudo systemctl start postgresql
```

### **2. Restaurar tabelas específicas:**
```bash
# Restaurar apenas as tabelas de backup
sudo -u postgres pgbackrest --stanza=db restore --table=kiwify_products --table=kiwify_purchases --table=kiwify_webhook_logs --table=whatsapp_users --table=profiles_backup --table=budgets
```

## 🔧 **AUTOMAÇÃO**

### **1. Script de backup automático:**
```bash
#!/bin/bash
# backup_automatico.sh

# Configurações
BACKUP_DIR="/var/backups/pgbackrest"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/pgbackrest.log"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Executar backup
sudo -u postgres pgbackrest --stanza=db backup --type=full >> $LOG_FILE 2>&1

# Verificar se backup foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "Backup realizado com sucesso em $(date)" >> $LOG_FILE
else
    echo "Erro no backup em $(date)" >> $LOG_FILE
    exit 1
fi
```

### **2. Cron para backup automático:**
```bash
# Editar crontab
sudo crontab -e

# Adicionar linha para backup diário às 2h
0 2 * * * /path/to/backup_automatico.sh
```

## ⚠️ **IMPORTANTE**

- **Use apenas em produção com PostgreSQL local**
- **Configure retenção adequada de backups**
- **Teste a restauração regularmente**
- **Monitore espaço em disco**
- **Configure alertas para falhas de backup**
