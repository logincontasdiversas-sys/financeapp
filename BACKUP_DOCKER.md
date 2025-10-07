# 💾 BACKUP VIA DOCKER

## 🔧 **BACKUP DE CONTAINER POSTGRESQL**

### **1. Backup completo do banco:**
```bash
# Backup completo
docker exec [CONTAINER_NAME] pg_dump -U [USER] -d [DATABASE] > backup_completo.sql

# Backup com schema e dados
docker exec [CONTAINER_NAME] pg_dump -U [USER] -d [DATABASE] --schema-only > backup_schema.sql
docker exec [CONTAINER_NAME] pg_dump -U [USER] -d [DATABASE] --data-only > backup_dados.sql
```

### **2. Backup de tabelas específicas:**
```bash
# Backup apenas das tabelas desnecessárias
docker exec [CONTAINER_NAME] pg_dump -U [USER] -d [DATABASE] --table=kiwify_products --table=kiwify_purchases --table=kiwify_webhook_logs --table=whatsapp_users --table=profiles_backup --table=budgets > backup_tabelas_desnecessarias.sql
```

### **3. Backup em formato CSV:**
```bash
# Para cada tabela individualmente
docker exec [CONTAINER_NAME] psql -U [USER] -d [DATABASE] -c "\copy kiwify_products TO '/tmp/kiwify_products.csv' WITH CSV HEADER"
docker exec [CONTAINER_NAME] psql -U [USER] -d [DATABASE] -c "\copy kiwify_purchases TO '/tmp/kiwify_purchases.csv' WITH CSV HEADER"
docker exec [CONTAINER_NAME] psql -U [USER] -d [DATABASE] -c "\copy kiwify_webhook_logs TO '/tmp/kiwify_webhook_logs.csv' WITH CSV HEADER"
docker exec [CONTAINER_NAME] psql -U [USER] -d [DATABASE] -c "\copy whatsapp_users TO '/tmp/whatsapp_users.csv' WITH CSV HEADER"
docker exec [CONTAINER_NAME] psql -U [USER] -d [DATABASE] -c "\copy profiles_backup TO '/tmp/profiles_backup.csv' WITH CSV HEADER"
docker exec [CONTAINER_NAME] psql -U [USER] -d [DATABASE] -c "\copy budgets TO '/tmp/budgets.csv' WITH CSV HEADER"

# Copiar arquivos para o host
docker cp [CONTAINER_NAME]:/tmp/kiwify_products.csv ./
docker cp [CONTAINER_NAME]:/tmp/kiwify_purchases.csv ./
docker cp [CONTAINER_NAME]:/tmp/kiwify_webhook_logs.csv ./
docker cp [CONTAINER_NAME]:/tmp/whatsapp_users.csv ./
docker cp [CONTAINER_NAME]:/tmp/profiles_backup.csv ./
docker cp [CONTAINER_NAME]:/tmp/budgets.csv ./
```

## 🔧 **BACKUP DE VOLUME DOCKER**

### **1. Backup do volume:**
```bash
# Criar backup do volume
docker run --rm -v [VOLUME_NAME]:/data -v $(pwd):/backup alpine tar czf /backup/backup_volume.tar.gz -C /data .

# Restaurar volume
docker run --rm -v [VOLUME_NAME]:/data -v $(pwd):/backup alpine tar xzf /backup/backup_volume.tar.gz -C /data
```

### **2. Backup com compressão:**
```bash
# Backup comprimido
docker exec [CONTAINER_NAME] pg_dump -U [USER] -d [DATABASE] | gzip > backup_completo.sql.gz

# Restaurar backup comprimido
gunzip -c backup_completo.sql.gz | docker exec -i [CONTAINER_NAME] psql -U [USER] -d [DATABASE]
```

## 🔧 **SCRIPT DE BACKUP AUTOMÁTICO**

### **1. Script de backup:**
```bash
#!/bin/bash
# backup_docker.sh

# Configurações
CONTAINER_NAME="postgres_container"
DB_USER="postgres"
DB_NAME="financeapp"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup completo
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_completo_$DATE.sql

# Backup das tabelas desnecessárias
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --table=kiwify_products --table=kiwify_purchases --table=kiwify_webhook_logs --table=whatsapp_users --table=profiles_backup --table=budgets > $BACKUP_DIR/backup_tabelas_desnecessarias_$DATE.sql

# Comprimir backups
gzip $BACKUP_DIR/backup_completo_$DATE.sql
gzip $BACKUP_DIR/backup_tabelas_desnecessarias_$DATE.sql

# Remover backups antigos (manter apenas 7 dias)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup realizado com sucesso em $(date)"
```

### **2. Tornar executável:**
```bash
chmod +x backup_docker.sh
```

### **3. Executar backup:**
```bash
./backup_docker.sh
```

## 🔧 **RESTAURAR BACKUP**

### **1. Restaurar backup completo:**
```bash
# Restaurar backup
docker exec -i [CONTAINER_NAME] psql -U [USER] -d [DATABASE] < backup_completo.sql
```

### **2. Restaurar tabelas específicas:**
```bash
# Restaurar apenas as tabelas de backup
docker exec -i [CONTAINER_NAME] psql -U [USER] -d [DATABASE] < backup_tabelas_desnecessarias.sql
```

## ⚠️ **IMPORTANTE**

- **Substitua [CONTAINER_NAME], [USER], [DATABASE] pelos valores corretos**
- **Teste a restauração antes de remover tabelas**
- **Mantenha backups por pelo menos 30 dias**
- **Configure backup automático se necessário**
