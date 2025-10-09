# Teste MCP Server Pipedream no Cursor

Este é um projeto **isolado** para testar a integração do MCP Server Pipedream no Cursor, **sem modificar seu app principal**.

## 🚀 **Como Usar**

### **1. Instalar dependências**
```bash
npm install
```

### **2. Configurar API Key do Pipedream**
```bash
# Obtenha sua API Key em: https://pipedream.com/dashboard
export PIPEDREAM_API_KEY="sua-chave-aqui"
```

### **3. Executar teste**
```bash
npm test
```

## 📋 **O que o teste faz**

1. **✅ Testa conexão** com Pipedream
2. **📋 Lista workflows** existentes
3. **🗄️ Simula integração** com Supabase
4. **📱 Simula workflow** WhatsApp
5. **🔧 Mostra configuração** para Cursor

## 🎯 **Resultado Esperado**

```
🚀 Teste do MCP Server Pipedream no Cursor
==================================================

🔍 Testando conexão com Pipedream...
✅ Conexão com Pipedream funcionando!
📊 Workflows encontrados: 3

📋 Listando workflows existentes...
📝 3 workflow(s) encontrado(s):
   1. FinanceBot WhatsApp (ID: wf_123)
   2. Test Workflow (ID: wf_456)
   3. Another Workflow (ID: wf_789)

🗄️ Testando integração com Supabase...
📝 Query simulada: {
  "query": "SELECT * FROM profiles WHERE phone_number = $1",
  "params": ["51996272989"],
  "expectedResult": {
    "user_id": "uuid-exemplo",
    "display_name": "Usuário Teste",
    "phone_number": "51996272989",
    "whatsapp_active": true
  }
}
✅ Integração com Supabase simulada com sucesso!

📱 Simulando workflow WhatsApp...
📝 Workflow simulado: {
  "trigger": {
    "type": "webhook",
    "source": "whatsapp",
    "data": {
      "phone_digits": "51996272989",
      "message": "Registre despesa R$65 Claro móvel débito em conta 05/10",
      "timestamp": "2025-10-08T22:30:00.000Z"
    }
  },
  "steps": [
    {
      "name": "Extract Phone Digits",
      "result": { "phone_digits": "51996272989" }
    },
    {
      "name": "Map User Profile",
      "result": {
        "user_id": "uuid-exemplo",
        "display_name": "Usuário Teste",
        "active_tenant_id": "tenant-uuid"
      }
    },
    {
      "name": "Query Categories",
      "result": [
        { "id": "cat1", "name": "Alimentação", "emoji": "🍽️" },
        { "id": "cat2", "name": "Transporte", "emoji": "🚗" },
        { "id": "cat3", "name": "Telefone", "emoji": "📞" }
      ]
    },
    {
      "name": "AI Parse with Gemini",
      "result": {
        "type": "expense",
        "title": "Claro móvel",
        "amount": 65.00,
        "date": "2025-10-05",
        "status": "settled",
        "category": "telefone",
        "payment_method": "débito em conta"
      }
    }
  ]
}
✅ Workflow WhatsApp simulado com sucesso!

==================================================
🎉 Todos os testes concluídos!

📋 Próximos passos:
   1. Configure sua API Key do Pipedream
   2. Crie um workflow real no dashboard
   3. Configure o MCP Server no Cursor
   4. Teste a integração completa

💡 Para configurar no Cursor:
   1. Abra Cursor
   2. Vá para Settings > MCP
   3. Adicione a configuração do Pipedream
   4. Teste a integração
```

## 🔧 **Configuração no Cursor**

Após o teste funcionar, configure no Cursor:

1. **Abra Cursor**
2. **Vá para Settings** (Ctrl+,)
3. **Procure por "MCP"**
4. **Adicione configuração:**

```json
{
  "mcpServers": {
    "pipedream": {
      "command": "npx",
      "args": ["@pipedream/mcp-server"],
      "env": {
        "PIPEDREAM_API_KEY": "sua-chave-aqui"
      }
    }
  }
}
```

## 🎯 **Vantagens desta Abordagem**

- ✅ **Não modifica** seu app principal
- ✅ **Teste isolado** e seguro
- ✅ **Fácil de remover** depois
- ✅ **Testa integração** completa
- ✅ **Prepara configuração** do Cursor

## 🗑️ **Limpeza**

Quando terminar os testes:
```bash
cd ..
rm -rf pipedream-mcp-test
```

---

**💡 Dica:** Este teste é completamente independente do seu FinanceApp!
