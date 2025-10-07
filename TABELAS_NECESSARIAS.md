# 📊 TABELAS NECESSÁRIAS NO FINANCEAPP

## ✅ TABELAS PRINCIPAIS (MANTER)

### 👥 **AUTENTICAÇÃO E USUÁRIOS**
- **`profiles`** - Dados dos usuários (nome, email, telefone, WhatsApp, admin)
- **`tenants`** - Organizações/empresas dos usuários
- **`tenant_members`** - Relacionamento usuários-organizações

### 💰 **FINANÇAS**
- **`transactions`** - Transações financeiras (receitas/despesas)
- **`banks`** - Contas bancárias dos usuários
- **`credit_cards`** - Cartões de crédito
- **`categories`** - Categorias de transações
- **`goals`** - Metas financeiras
- **`debts`** - Dívidas dos usuários

### 🔔 **SISTEMA**
- **`notifications`** - Sistema de notificações push

## ❌ TABELAS DESNECESSÁRIAS (REMOVER)

### 🗑️ **KIWIFY (NÃO UTILIZADAS)**
- ❌ `kiwify_products` - Não há código que use
- ❌ `kiwify_purchases` - Não há código que use
- ❌ `kiwify_webhook_logs` - Não há código que use

### 🗑️ **WHATSAPP (REDUNDANTE)**
- ❌ `whatsapp_users` - Dados já estão em `profiles`

### 🗑️ **BACKUP (DESNECESSÁRIA)**
- ❌ `profiles_backup` - Não há código que use

### 🗑️ **VIEWS (NÃO UTILIZADAS)**
- ❌ `v_bank_balances` - Não há código que use
- ❌ `v_card_spent_month` - Não há código que use
- ❌ `v_totals_month_year` - Não há código que use

### 🗑️ **BUDGETS (NÃO IMPLEMENTADA)**
- ❌ `budgets` - Apenas no backup, não há interface

## 🎯 **BENEFÍCIOS DA LIMPEZA**

- ✅ **Redução de complexidade** do banco
- ✅ **Melhoria de performance** 
- ✅ **Menos manutenção** necessária
- ✅ **Banco mais limpo** e organizado
- ✅ **Menos confusão** para desenvolvedores

## 📋 **INSTRUÇÕES**

1. **Execute o script** `LIMPAR_TABELAS_DESNECESSARIAS.sql`
2. **Verifique** se não há dados importantes
3. **Teste** o aplicativo após a limpeza
4. **Monitore** se tudo funciona corretamente

## ⚠️ **ATENÇÃO**

- **Faça backup** antes de executar
- **Verifique** se não há dados importantes
- **Teste** em ambiente de desenvolvimento primeiro
- **Execute** com cuidado em produção
