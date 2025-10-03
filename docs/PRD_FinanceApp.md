# PRD - FinanceApp 

## 📊 Visão Geral do Produto
**FinanceApp** é uma aplicação completa de gestão financeira pessoal construída com React, TypeScript, Tailwind CSS e Supabase, oferecendo controle total sobre receitas, despesas, metas, dívidas e cartões de crédito com interface moderna e responsiva.

## 🎯 Objetivos Principais
- ✅ Gestão completa de finanças pessoais
- ✅ Interface intuitiva e responsiva
- ✅ Sincronização em tempo real com Supabase
- ✅ Sistema de autenticação robusto
- ✅ Dashboard com visualizações avançadas
- ⏳ Controle offline com localStorage
- ⏳ Gamificação para motivar o usuário

## 🏗️ Arquitetura Técnica

### Stack Principal
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn-ui
- **Charts**: Recharts para gráficos
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Deploy**: Vercel
- **PWA**: Service Worker + Manifest

### Estrutura do Banco (Supabase) - ✅ IMPLEMENTADO
```sql
-- Tabelas principais (todas criadas e funcionais)
✅ credit_cards (cartões de crédito/débito)
✅ expenses (despesas) 
✅ tenant_members (membros do tenant)
✅ tenants (sistema multi-tenant)
✅ v_totals_month_year (view para totais mensais)
✅ budgets (orçamentos)
✅ debts (dívidas com campos observations e is_concluded)
✅ profiles (perfis de usuário)
✅ v_card_spent_month (view para gastos mensais dos cartões)
✅ transactions (receitas e despesas unificadas)
✅ v_bank_balances (view para saldos bancários)
✅ banks (contas bancárias)
✅ categories (categorias de transações)
✅ goals (metas financeiras com campo current_amount)
✅ notifications (notificações)

-- RLS (Row Level Security) configurado e funcionando
-- Realtime habilitado para todas as tabelas
-- Auth configurado com email/password
-- Migrações aplicadas: debts table criada com campos adicionais
```

## 🚀 Funcionalidades Implementadas

### ✅ Sistema de Logging Centralizado (100% Completo)
- [x] Logger centralizado para substituir console.error espalhados
- [x] Níveis de log (error, warn, info, debug)
- [x] Cache de logs para debug em produção
- [x] Formatação estruturada com componente, timestamp e userId
- [x] Modo desenvolvimento vs produção
- [x] Export de logs para análise

### ✅ Otimização de Performance (100% Completo)
- [x] Hook useSupabaseQuery para cache de queries
- [x] Cache de 5 minutos para evitar queries repetitivas
- [x] Sistema de debounce para sincronização
- [x] Lazy loading de componentes pesados

### ✅ PWA Básico (100% Completo)
- [x] Service Worker implementado
- [x] Manifest.json configurado
- [x] Cache offline para recursos estáticos
- [x] Registro automático do SW

### ✅ Autenticação (100% Completo)
- [x] Login/Cadastro com Supabase Auth integrado
- [x] Sessões persistentes com localStorage
- [x] Redirecionamento automático baseado em auth state
- [x] Gerenciamento de estado de auth via Context
- [x] Páginas protegidas com ProtectedRoute/PublicRoute
- [x] Interface de login/cadastro com tabs
- [x] Validação de forms e feedback visual
- [x] Logout com limpeza de dados locais

### ✅ Dashboard (100% Completo)
- [x] Visão geral financeira completa
- [x] Cards com resumos (receitas, despesas, saldo)
- [x] **Cálculo de saldo por banco** (saldo inicial + receitas - despesas separado por banco)
- [x] Seção de bancos com saldos calculados e detalhamento das movimentações
- [x] Seção de cartões de crédito
- [x] Histórico de transações em tempo real
- [x] Gráfico de gastos por categoria (2D)
- [x] Gráfico 3D interativo de categorias com Three.js
- [x] Calendário com transações
- [x] Sistema de alertas automáticos
- [x] Status financeiro (positivo/negativo)
- [x] Contadores de metas ativas e dívidas abertas
- [x] Layout responsivo completo
- [x] Loading states com skeleton
- [x] Tema claro/escuro integrado
- [x] **Cálculo Correto de Percentuais**: Baseado em receitas líquidas (excluindo transferências)
- [x] **Fallback Inteligente**: Se receita = 0, calcula sobre total das despesas
- [x] **Filtros de Período**: Dashboard (mês atual) vs Movimentações (período filtrado)
- [x] **Seção Bancos Compacta**: Espaçamento otimizado para melhor visualização

### ✅ Gestão de Transações (100% Completo)
- [x] **Receitas**: CRUD completo com categorização e associação a bancos
- [x] **Despesas**: CRUD completo com categorização e associação a bancos  
- [x] Sistema unificado de transações (kind: income/expense)
- [x] Categorização automática por tipo
- [x] **Campo banco integrado** nos formulários de receitas e despesas
- [x] **Sincronização em tempo real** - mudanças aparecem instantaneamente sem refresh
- [x] Filtros por data, categoria e status
- [x] Múltiplas formas de pagamento
- [x] Status (settled/pending) com controle visual
- [x] Integração completa com Supabase realtime
- [x] Formatação monetária brasileira (BRL)
- [x] Validação de dados e tratamento de erros

### ✅ Infraestrutura (100% Completo)
- [x] Supabase integrado e configurado
- [x] RLS (Row Level Security) configurado e funcional
- [x] **Realtime habilitado para sincronização automática** 
- [x] **Sincronização em tempo real para todos os dados** - mudanças aparecem instantaneamente
- [x] Sistema completo de componentes UI (shadcn-ui)
- [x] Sistema de toasts para feedback (sonner + shadcn)
- [x] Hooks customizados (useAuth, useOfflineSync, useTenant, usePRDUpdate, useRealtimeSync)
- [x] **Sistema automático de atualização do PRD** - registra mudanças automaticamente
- [x] Roteamento com react-router-dom
- [x] Sistema de temas com next-themes
- [x] TypeScript strict mode
- [x] Estrutura de projeto organizada
- [x] Error boundaries implementados
- [x] Service Worker para PWA

### ✅ Módulos Específicos (100% Completo)
- [x] **Categorias**: CRUD com emojis expandidos (200+) e arquivamento
- [x] **Bancos**: CRUD de contas bancárias com saldos históricos
- [x] **Cartões**: CRUD de cartões com gastos mensais e sincronização realtime
- [x] **Metas**: CRUD com sistema de progresso e **campo valor atual**
- [x] **Dívidas**: CRUD com controle de vencimentos, **observações** e **conclusão sem valores**
- [x] **Sincronização automática** - todos os dados atualizam em tempo real
- [x] **Sistema de projeções futuras** - cálculos incluem transações pending
- [x] **Separação de despesas** - filtro para despesas normais vs cartão de crédito
- [x] **Edição inline avançada** - popup organizado para categorias
- [x] **Responsividade ao tema** - gráficos e labels se adaptam ao tema claro/escuro
- [x] Sidebar de navegação responsiva
- [x] Sistema de sync offline (parcial)
- [x] Componentes de layout reutilizáveis

### ✅ Interface Mobile Otimizada (100% Completo)
- [x] **Layout Timeline**: Sistema de timeline com pontos coloridos para mobile
- [x] **Alinhamento Perfeito**: Linha vertical centralizada com pontos de transação
- [x] **Grid Responsivo**: Sistema de 12 colunas com altura padronizada (56px)
- [x] **Seleção Intuitiva**: Checkboxes externos com modo de seleção
- [x] **Ações Compactas**: Botões Editar/Duplicar/Excluir otimizados para mobile
- [x] **Status Condicional**: Exibição de "Pendente" apenas quando necessário
- [x] **Consistência Visual**: Mesmo padrão em Despesas, Receitas e Movimentações
- [x] **Agrupamento Inteligente**: Receitas primeiro, depois despesas no mesmo dia

### ⏳ Sistema de Categorias para Metas e Dívidas (Parcial)
- [x] **Categorização na Criação**: Campo de categoria no formulário de metas/dívidas
- [x] **Pagamento Automático**: Usa categoria definida automaticamente
- [x] **Contabilização Correta**: Gastos ficam na categoria escolhida + progresso individual
- [x] **Migração Automática**: Metas/dívidas existentes recebem categorias padrão
- [x] **Flexibilidade**: Usuário pode editar categoria a qualquer momento
- [x] **Interface Organizada**: Seleção de categorias em grupos lógicos
- [x] **Compatibilidade**: Sistema funciona com dados existentes
- [x] **Progresso Inteligente**: Recálculo automático após mudanças de status
- [x] **Filtros Avançados**: Separação clara entre categorias padrão e especiais
- [x] **Performance Otimizada**: Logs reduzidos e queries eficientes

## 🐛 Problemas Resolvidos

### ✅ Erro RLS na Tabela Transactions 
**Status**: Resolvido ✅
**Problema**: "new row violates row-level security policy for table 'transactions'"
**Solução**: Simplificação das políticas RLS de sistema tenant para user-based:
```sql
CREATE POLICY "users_can_insert_own_transactions" ON transactions 
FOR INSERT WITH CHECK (user_id = auth.uid());
```

### ✅ Sistema de Autenticação
**Status**: Resolvido ✅
**Problema**: Estado de auth inconsistente e redirecionamentos incorretos
**Solução**: Implementado AuthProvider robusto com Context API e gerenciamento de estado

### ✅ Integração Supabase
**Status**: Resolvido ✅  
**Problema**: Configuração inicial e conexão com banco
**Solução**: Cliente Supabase configurado com persistência de sessão

## 📋 Funcionalidades Pendentes

### ✅ Funcionalidades Avançadas (95% Completo)
- [x] **Sincronização Offline**: Sistema robusto com hooks especializados
- [x] **PWA**: Service Worker básico implementado
- [x] **Sistema de Logging**: Substituição completa dos console.error
- [x] **Cache de Queries**: Otimização para evitar queries repetitivas
- [ ] **Relatórios PDF**: Geração mensal via pdf-lib
- [ ] **Notificações Push**: Lembretes de vencimentos
### 📣 Notificações Push - Decisão de Armazenamento

- Estratégia de baixo custo: armazenar uma inscrição por usuário em `profiles.push_subscription` (JSONB). Evita criar tabela dedicada e minimiza uso de armazenamento.
- SQL para habilitar:
```sql
alter table profiles add column if not exists push_subscription jsonb;
```
- Fluxo do cliente:
  - Pedir permissão → `subscribe()` via Service Worker (VAPID)
  - Salvar `{ endpoint, p256dh, auth, ts }` em `profiles.push_subscription`
- Envio: via edge function gratuita (futuro), lendo `profiles.push_subscription` por `auth.uid()`

#### Edge Function `send-push`
- Caminho: `supabase/functions/send-push/index.ts`
- Secrets necessárias (no Supabase):
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
- Deploy (CLI):
```bash
supabase functions deploy send-push --no-verify-jwt
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
```
- Chamada (com Bearer token do usuário):
```bash
POST /functions/v1/send-push
{
  "title": "Lembrete",
  "body": "Sua fatura vence amanhã",
  "url": "/"
}
```

- [ ] **Backup/Restore**: Export/Import de dados completos

### ⏳ Melhorias UI/UX (Média Prioridade)
- [ ] **Loading States**: Melhorar skeletons e feedback visual
- [ ] **Animações**: Transições suaves entre páginas
- [ ] **Responsive**: Otimização para mobile/tablet
- [ ] **Atalhos**: Comandos de teclado para power users
- [ ] **Modo Compacto**: Interface simplificada para mobile
- [ ] **Tooltips**: Ajuda contextual em formulários

### ⏳ Funcionalidades de Negócio (Baixa Prioridade)
- [ ] **Orçamentos Avançados**: Controle de limite por categoria com alertas
- [ ] **Comparativos**: Análises mês vs mês, ano vs ano
- [ ] **Previsões**: Dashboard preditivo baseado em histórico
- [ ] **Importação**: CSV/OFX de bancos brasileiros
- [ ] **Gamificação**: Sistema de conquistas e badges
- [ ] **Relatórios**: Dashboards personalizáveis

### ⏳ Funcionalidades Técnicas (Contínuas)
- [ ] **Testes**: Cobertura de testes automatizados
- [ ] **Performance**: Otimização de queries e caching
- [ ] **SEO**: Meta tags e structured data
- [ ] **Analytics**: Tracking de uso e performance
- [ ] **Logs**: Sistema de logging estruturado

## 🎨 Design System

### Cores Principais (HSL)
```css
--primary: configurado via index.css
--secondary: sistema semântico
--accent: tokens reutilizáveis
--muted: para texto secundário
```

### Componentes Base
- Cards para seções principais
- Tables para listagens
- Forms com validação
- Dialogs para modais
- Buttons com variantes
- Charts responsivos

## 💰 Lógica de Cálculo de Saldo Sequencial e Dinâmico

### 🎯 Conceito Principal
O sistema implementa um **cálculo de saldo sequencial** onde o saldo inicial do banco é usado apenas uma vez (no primeiro período com transações), e todos os períodos subsequentes calculam seu saldo baseado no saldo final do período anterior.

### 📋 Regras Fundamentais

#### 1. **Identificação do Primeiro Período**
- **Critério**: Período que contém a transação mais antiga do usuário
- **Implementação**: Função `checkIfFirstMonth(tenantId, startDate)`
- **Lógica**: Busca a transação mais antiga e verifica se está no período atual

#### 2. **Cálculo do Primeiro Período**
```typescript
// PRIMEIRO PERÍODO: Saldo inicial + receitas - despesas
totalBalance = saldoInicialBanco + receitasPeriodo - despesasPeriodo
saldoMesPassado = saldoInicialBanco
```

#### 3. **Cálculo dos Períodos Subsequentes**
```typescript
// PERÍODOS SUBSEQUENTES: Saldo anterior + receitas - despesas
totalBalance = saldoFinalPeriodoAnterior + receitasPeriodo - despesasPeriodo
saldoMesPassado = saldoFinalPeriodoAnterior
```

### 🔄 Cálculo Dinâmico Baseado em Filtros

#### **Função Principal**: `getPreviousPeriodBalance(tenantId, currentStartDate, currentEndDate)`

#### **Lógica de Período Anterior**:
1. **Duração do período atual**: `periodDuration = currentEnd - currentStart`
2. **Fim do período anterior**: `previousEnd = currentStart - 1 dia`
3. **Início do período anterior**: `previousStart = previousEnd - periodDuration`

#### **Exemplos Práticos**:

##### **Dashboard Nativo (Mês Atual - Outubro)**:
- **Período atual**: 01/10/2025 a 31/10/2025
- **Período anterior**: 01/09/2025 a 30/09/2025
- **Saldo mostrado**: Saldo acumulado até 30/09/2025

##### **Filtro "Mês Passado" (Setembro)**:
- **Período atual**: 01/09/2025 a 30/09/2025
- **Período anterior**: 01/08/2025 a 31/08/2025
- **Saldo mostrado**: Saldo acumulado até 31/08/2025

##### **Filtro "Agosto"**:
- **Período atual**: 01/08/2025 a 31/08/2025
- **Período anterior**: 01/07/2025 a 31/07/2025
- **Saldo mostrado**: Saldo acumulado até 31/07/2025

##### **Período Personalizado (15/09 a 25/09)**:
- **Período atual**: 15/09/2025 a 25/09/2025 (11 dias)
- **Período anterior**: 04/09/2025 a 14/09/2025 (11 dias)
- **Saldo mostrado**: Saldo acumulado até 14/09/2025

### 🧮 Fórmula de Cálculo Acumulado

```typescript
// Para qualquer período anterior:
saldoAcumulado = saldoInicialBanco + Σ(receitas) - Σ(despesas)
// Onde Σ = soma de todas as transações desde o início até o final do período anterior
```

### 🚫 Filtros Aplicados

#### **Transferências Entre Bancos Excluídas**:
```typescript
const isRealTransfer = (
  title.includes('transferência entre bancos') ||
  title.includes('transferencia entre bancos') ||
  title.includes('transfer between banks') ||
  (title.includes('transferência de') && title.includes('para')) ||
  (title.includes('transferencia de') && title.includes('para'))
);
```

#### **Apenas Transações Liquidadas**:
```sql
.eq('status', 'settled')
```

### 📊 Exemplo Sequencial Completo

#### **Cenário**: Usuário com saldo inicial R$ 1.000,00

| Período | Receitas | Despesas | Saldo Anterior | Saldo Final | Saldo Mês Passado |
|---------|----------|----------|----------------|-------------|-------------------|
| **Agosto** (1º) | R$ 2.000 | R$ 1.100 | R$ 1.000 | R$ 1.900 | R$ 1.000 |
| **Setembro** | R$ 1.500 | R$ 1.200 | R$ 1.900 | R$ 2.200 | R$ 1.900 |
| **Outubro** | R$ 800 | R$ 1.000 | R$ 2.200 | R$ 2.000 | R$ 2.200 |

### 🔧 Implementação Técnica

#### **Arquivos Principais**:
- **`src/pages/Dashboard.tsx`**: Lógica principal de cálculo
- **`src/components/dashboard/FinancialSummary.tsx`**: Exibição dos valores

#### **Funções Chave**:
1. **`checkIfFirstMonth()`**: Identifica se é o primeiro período
2. **`getPreviousPeriodBalance()`**: Calcula saldo do período anterior
3. **`loadDashboardData()`**: Orquestra todo o cálculo

#### **Estados Gerenciados**:
```typescript
const [stats, setStats] = useState({
  totalBalance: 0,        // Saldo total do período
  prevMonthBalance: 0,    // Saldo do período anterior
  totalReceitas: 0,       // Receitas do período
  totalDespesas: 0,       // Despesas do período
  // ... outros campos
});
```

### ⚡ Performance e Otimização

#### **Queries Otimizadas**:
- **Uma query por período**: Busca todas as transações até o final do período anterior
- **Filtros no banco**: Aplicados via Supabase para reduzir dados transferidos
- **Cache local**: Resultados armazenados para evitar recálculos desnecessários

#### **Tratamento de Erros**:
- **Fallback para saldo inicial**: Em caso de erro, retorna saldo inicial do banco
- **Logs detalhados**: Console logs para debug e monitoramento
- **Validação de dados**: Verificação de existência de transações

### 🎯 Benefícios da Implementação

1. **Precisão Histórica**: Saldo sempre reflete o estado real acumulado
2. **Flexibilidade de Filtros**: Funciona com qualquer período selecionado
3. **Consistência**: Mesma lógica aplicada independente do filtro
4. **Performance**: Cálculos otimizados e cache inteligente
5. **Manutenibilidade**: Código modular e bem documentado

## 📊 Parâmetros de Gráficos e Visualizações

### 1. Gráfico de Barras Mensais (MonthlyChart)
**Localização**: `src/components/dashboard/MonthlyChart.tsx`  
**Uso**: Dashboard principal - "Evolução das Receitas e Despesas"

#### Parâmetros Visuais
- **Container**: `h-80` (320px), `ResponsiveContainer` 100% width/height
- **Margens**: `{ top: 5, right: 30, left: 20, bottom: 5 }`
- **Barras**: `barSize={80}`, `barCategoryGap="2%"`, `radius={[4, 4, 0, 0]}`
- **Cores**:
  - Receitas Pagas: `#10b981` (Verde)
  - Despesas Pagas: `#ef4444` (Vermelho) 
  - Receitas Pendentes: `#86efac` (Verde claro)
  - Despesas Pendentes: `#fca5a5` (Vermelho claro)
- **Transparência Futura**: 
  - Receitas Pagas: `rgba(16, 185, 129, 0.6)` (Verde 60% opacidade)
  - Despesas Pagas: `rgba(239, 68, 68, 0.6)` (Vermelho 60% opacidade)
  - Receitas Pendentes: `rgba(134, 239, 172, 0.6)` (Verde claro 60% opacidade)
  - Despesas Pendentes: `rgba(252, 165, 165, 0.6)` (Vermelho claro 60% opacidade)
- **Eixos**: X rotacionado -45°, Y formatado em milhares (R$ Xk)
- **Legenda**: Customizada com 4 itens únicos, sem duplicação
- **Empilhamento**: `stackId="receitas"` e `stackId="despesas"`

### 2. Gráfico de Linha Simples (SingleLineChart)
**Localização**: `src/components/dashboard/SingleLineChart.tsx`  
**Uso**: Páginas de Receitas/Despesas - "Evolução ao Longo do Ano"

#### Parâmetros Visuais
- **Container**: `h-80` (320px), `ResponsiveContainer` 100% width/height
- **Margens**: `{ top: 5, right: 30, left: 20, bottom: 5 }`
- **Linhas**:
  - Sólida: `strokeWidth={3}`, cor dinâmica via prop
  - Projetada: `strokeWidth={3}`, `strokeOpacity={0.4}`, `strokeDasharray="4 4"`
- **Pontos**: Raio 4px, cor dinâmica, opacidade 0.4 para projetada
- **Eixos**: `fontSize={12}`, formatação `R$${v}`
- **Legenda**: Customizada abaixo do gráfico com indicadores coloridos

### 3. Gráfico de Pizza - Categorias (CategoryPieChart)
**Localização**: `src/components/dashboard/CategoryPieChart.tsx`  
**Uso**: Dashboard - "Distribuição de Gastos por Categoria"

#### Parâmetros Visuais
- **Container**: `height={400}`, layout grid `md:grid-cols-3`
- **Pizza**: `outerRadius={140}`, `innerRadius={0}`, `strokeWidth={2}`
- **Cores da Paleta**:
  ```javascript
  ['#4472C4', '#0F4761', '#E15759', '#C5504B', '#70AD47', 
   '#F79646', '#9966CC', '#4BACC6', '#8C8C8C']
  ```
- **Labels**: `labelLine={false}`, apenas porcentagem `toFixed(0)%`
- **Tooltip**: `bg-background border rounded-lg p-3 shadow-md max-w-xs`
- **Legenda**: Lista vertical com círculos coloridos `w-3 h-3 rounded-full`

### 4. Gráfico de Pizza - Despesas (CategoryExpenseChart)
**Localização**: `src/components/dashboard/CategoryExpenseChart.tsx`  
**Uso**: Páginas de Despesas - "Distribuição de Gastos por Categoria"

#### Parâmetros Visuais
- **Container**: `height={500}`, layout grid `md:grid-cols-3`
- **Margens**: `{ top: 20, right: 80, bottom: 20, left: 80 }`
- **Pizza**: `outerRadius={140}`, `innerRadius={0}`, `strokeWidth={2}`
- **Cores**: Mesma paleta do CategoryPieChart
- **Labels**: Customizados via `CustomLabel`, apenas se `percentage >= 3`
- **Tooltip**: Mesmo estilo do CategoryPieChart
- **Legenda**: Lista vertical com indicadores e valores formatados

### 5. Configurações Globais dos Gráficos

#### Biblioteca e Framework
- **Recharts**: BarChart, LineChart, PieChart, ResponsiveContainer
- **Tema**: Cores baseadas em CSS variables (`hsl(var(--muted))`)
- **Responsividade**: `ResponsiveContainer` com `width="100%"`

#### Formatação de Dados
- **Moeda**: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- **Valores Grandes**: `R$ ${(value / 1000).toFixed(0)}k`
- **Porcentagens**: `toFixed(1)` para uma casa decimal

#### Performance e Otimização
- **Debounce**: `debounceMs: 700` para realtime sync
- **Loading States**: `animate-pulse` com skeleton
- **Cache**: Queries otimizadas para evitar PGRST201 errors
- **Animações**: `isAnimationActive={true}` quando aplicável

#### Acessibilidade
- **Contraste**: Cores com contraste adequado
- **Legendas**: Sempre presentes e descritivas
- **Tooltips**: Informações detalhadas ao hover
- **Estados Vazios**: Mensagens descritivas quando sem dados

### 6. Manutenção e Extensibilidade

#### Cores Customizáveis
- **CSS Variables**: `hsl(var(--muted))` para temas
- **Paleta Centralizada**: Arrays de cores reutilizáveis
- **Transparência**: Valores RGBA para flexibilidade

#### Configuração Flexível
- **Props**: Títulos, cores e comportamentos via props
- **Filtros**: Suporte a filtros de data customizados
- **Períodos**: Suporte a períodos futuros com transparência

#### Debugging
- **Console Logs**: Logs detalhados para debugging
- **Error Handling**: Try/catch com mensagens específicas
- **Validação**: Verificação de dados antes da renderização

## 🔧 Scripts e Comandos

### Desenvolvimento
```bash
npm run dev          # Servidor local
npm run build        # Build produção
npm run preview      # Preview build
npm run lint         # ESLint check
```

### Vercel Deploy (IMPORTANTE - Deploy Único)
```bash
# ✅ FLUXO CORRETO - Apenas um deploy
git add .
git commit -m "sua mensagem"
git push origin main  # Deploy automático via GitHub Integration

# ❌ NÃO FAZER - Evita deploy duplo
# npx vercel --prod  # Deploy manual desnecessário
```

**⚠️ ATENÇÃO**: O Vercel está configurado com GitHub Integration para deploy automático. 
- **Deploy automático**: Acontece a cada `git push origin main`
- **Deploy manual**: `npx vercel --prod` causa deploy duplicado
- **Cursor Auto-commit**: Cursor pode fazer commit automático ao aceitar mudanças
- **Limite gratuito**: 100 deploys/dia - evitar desperdício com deploys duplos

**🔧 ESTRATÉGIA DE DEPLOY AUTOMÁTICO ÚNICO**:
1. **Deploy automático**: Após cada edição, fazer commit + push automaticamente
2. **Apenas 1 deploy**: Garantir que cada alteração gere apenas 1 deploy
3. **Evitar duplicação**: Nunca usar `npx vercel --prod` manualmente
4. **Fluxo padronizado**: Sempre `git add .` → `git commit` → `git push origin main`
5. **Monitoramento**: Verificar se há apenas 1 deploy por push no Vercel

**⚠️ PROBLEMA IDENTIFICADO: Deploy Hook Duplicado**:
- **GitHub Integration**: Deploy automático via push
- **Deploy Hook**: Deploy adicional desnecessário
- **Solução**: Desabilitar Deploy Hook no Vercel Dashboard
- **Configuração**: Settings → Git → Desabilitar Deploy Hook
- **Manter apenas**: GitHub Integration ativo

### Supabase
```bash
# Políticas já configuradas via migração
# Realtime habilitado para todas as tabelas
# Auth configurado com email/password
```

## 📈 Métricas de Sucesso
- [ ] Tempo de carregamento < 2s
- [ ] PWA com score 95+ no Lighthouse
- [ ] Zero erros de RLS/Auth
- [ ] 100% funcionalidades offline
- [ ] Testes automatizados E2E

## 🚨 Problemas Conhecidos e Monitoramento

### ✅ Problemas Resolvidos (Janeiro 2025)
- **Error Handling**: Sistema de logging centralizado implementado ✅
  - Logger estruturado substituindo console.error
  - Níveis de log configuráveis
  - Cache para debugging em produção
  
- **Performance**: Cache de queries implementado ✅
  - Hook useSupabaseQuery com cache de 5 minutos
  - Redução significativa de queries repetitivas
  - Sistema de debounce para sincronização

- **Offline Sync**: Sistema robusto implementado ✅
  - Hooks especializados para armazenamento offline
  - Sincronização automática quando online
  - Interface de usuário para status de sync

### ✅ Correções de Interface Mobile (Setembro 2025)
- **Timeline Mobile**: Alinhamento perfeito de linha vertical com pontos ✅
  - Sistema de grid 12 colunas com altura padronizada (56px)
  - Linha vertical centralizada com pontos coloridos
  - Distância consistente entre elementos (60px)
  - Debug borders removidos para interface limpa

- **Sistema de Seleção**: Interface intuitiva para mobile ✅
  - Checkboxes externos posicionados corretamente
  - Modo de seleção com botão "Selecionar" → "Selecionar Todos"
  - Ações compactas (Editar/Duplicar/Excluir) otimizadas para mobile
  - Botão "Cancelar" sempre visível

- **Consistência Visual**: Padrão unificado entre páginas ✅
  - Mesmo layout em Despesas, Receitas e Movimentações
  - Agrupamento inteligente: Receitas primeiro, depois despesas
  - Status condicional: "Pendente" apenas quando necessário
  - Remoção de funcionalidades desnecessárias em Movimentações

### ✅ Correções de Cálculos e Gráficos (Setembro 2025)
- **Gráfico de Categorias**: Cálculo correto de percentuais ✅
  - Base: receitas líquidas do período (excluindo transferências entre bancos)
  - Fallback: se receita = 0, calcula sobre total das despesas
  - Filtros corretos: Dashboard (mês atual) vs Movimentações (período filtrado)
  - Exclusão de categorias "- fatura" e "Transferência entre Bancos"

- **Interface de Gráficos**: Visual consistente entre páginas ✅
  - Mesmo estilo visual entre Dashboard e Movimentações
  - Labels diretos nos slices (sem linhas conectoras)
  - Paleta de cores consistente
  - Legenda organizada com valores e percentuais

- **Seção Bancos**: Layout mais compacto ✅
  - Espaçamento reduzido entre linhas
  - Fontes otimizadas para melhor densidade
  - Visual mais limpo e organizado

### ✅ Correções de Sistema de Dívidas e Metas (Janeiro 2025)
- **Progresso de Dívidas**: Recálculo correto após pagamentos ✅
  - Recálculo executado APÓS salvar transação (evita race conditions)
  - Funciona para qualquer status (settled/pending)
  - Validação segura para evitar dívida quitada incorretamente
  - Logs detalhados para debug do processo

- **Contabilização de Categorias**: Sistema híbrido implementado ✅
  - Transações usam categoria especial para identificação
  - Gráficos mostram categoria padrão para contabilização
  - Campos debt_special_category_id e goal_special_category_id preparados
  - Migração criada para novos campos na tabela transactions

- **Interface de Categorias**: Filtros otimizados ✅
  - Categorias especiais separadas das padrões
  - Filtros robustos para evitar duplicação
  - Performance melhorada com logs reduzidos
  - Ordem lógica: Categorias → Faturas → Metas → Dívidas

- **Correções de Erros**: Estabilidade melhorada ✅
  - Erros 400 do Supabase corrigidos
  - Service Worker com tratamento de erros robusto
  - Manifest.json com sintaxe correta
  - Interfaces TypeScript atualizadas

### ✅ Problemas Resolvidos (Janeiro 2025)

### ✅ Cartões de Crédito - Problema de Exibição: ✅ RESOLVIDO
- **Status**: ✅ CORRIGIDO em 09/01/2025
- **Problema**: Cartões cadastrados só apareciam quando o usuário trocava de aba e voltava
- **Causa**: Race condition entre carregamento do tenantId e busca dos cartões
- **Solução**: Implementado aguardar `tenantLoading` antes de executar queries + sincronização realtime
- **Resultado**: Cartões aparecem imediatamente após salvamento e atualizações automáticas em tempo real

### ⚠️ Problemas Ativos (Baixa Prioridade)
- **React Router Warnings**: Flags futuras v7_startTransition e v7_relativeSplatPath
  - Solução: Adicionar future flags no router para compatibilidade com v7
  
- **Badge Component Ref**: Warning sobre React.forwardRef ✅ CORRIGIDO
  - Era causado pelo Tooltip tentando passar ref para Badge sem forwardRef
  
- **PWA Avançado**: Implementar Workbox para cache mais sofisticado
- **Notificações**: Sistema de push notifications pendente

### ✅ Problemas Resolvidos
- **RLS Violations**: Políticas de segurança corrigidas
- **Auth State**: Gerenciamento de estado de autenticação estável
- **Routing**: Proteção de rotas funcionando corretamente

### 🔍 Monitoramento Contínuo
- **Database**: 16 tabelas ativas com RLS configurado
- **Auth Flow**: Login/logout funcionando consistentemente
- **Realtime**: Sincronização automática ativa
- **UI Components**: 45+ componentes shadcn-ui integrados

## 📚 Documentação Técnica

### Estrutura de Pastas
```
src/
├── components/     # Componentes reutilizáveis
├── pages/         # Páginas da aplicação  
├── hooks/         # Hooks customizados
├── services/      # Serviços (localStorage, etc)
├── integrations/  # Supabase client e types
└── lib/          # Utilitários gerais
```

### Padrões de Código
- TypeScript strict mode
- ESLint + Prettier configurados
- Componentes funcionais com hooks
- Props tipadas com interfaces
- Error boundaries implementados

## 📊 Status Atual do Projeto

### Estatísticas de Implementação
- **Páginas**: 9 páginas funcionais (Dashboard, Auth, Receitas, Despesas, etc.)
- **Componentes**: 60+ componentes (UI + Business Logic)  
- **Hooks**: 8 hooks customizados (useAuth, useOfflineSync, useTenant, useMobile, useRealtimeSync, etc.)
- **Database**: 17 tabelas conectadas via Supabase (incluindo debts)
- **Funcionalidades Core**: 95% implementadas
- **UI/UX**: 95% implementada (responsiva + tema escuro + otimizações)
- **Backend**: 98% implementado (Supabase + RLS + migrações)

### Próximos Marcos
- **V1.0**: Lançamento MVP com funcionalidades core (95% completo)
- **V1.1**: PWA + Sincronização offline robusta
- **V1.2**: Relatórios avançados + Gamificação
- **V2.0**: IA para insights financeiros

### Arquivos Principais
```
Total: 80+ arquivos
├── Páginas: 9 arquivos
├── Componentes: 50+ arquivos  
├── Hooks: 4 arquivos
├── Serviços: 2 arquivos
├── Configuração: 8 arquivos
└── Documentação: 2 arquivos
```

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.2.1 (95% completo - 5 problemas em aberto)
**Status**: Lançamento V1.2.1 - Sistema de dívidas e metas otimizado com progresso inteligente
**Próximo milestone**: V1.2.2 - Correção de problemas em aberto + V1.3 - Relatórios avançados

## 🆕 NOVAS FUNCIONALIDADES IMPLEMENTADAS (Janeiro 2025)

### ✅ Sistema de Projeções Futuras
- [x] Detecção automática de períodos futuros
- [x] Inclusão de transações pending em cálculos
- [x] Títulos dinâmicos para projeções
- [x] Transparência visual em gráficos futuros

### ✅ Gestão Avançada de Dívidas
- [x] Campo de observações para negociações
- [x] Checkbox de conclusão sem valores
- [x] Seção separada para dívidas concluídas
- [x] Diferenciação visual (azul vs verde)
- [x] Barra de progresso 100% para concluídas

### ✅ Metas com Valor Atual
- [x] Campo "Valor Atual" no formulário
- [x] Consideração de valores já possuídos
- [x] Cálculo de progresso realista
- [x] Casos de uso: troca de carro, casa própria

### ✅ Otimizações de Interface
- [x] Popups responsivos (max-h-[90vh])
- [x] Responsividade ao tema claro/escuro
- [x] 60 cores únicas em gráficos
- [x] Labels externos em gráficos de pizza
- [x] Edição inline com popup organizado
- [x] 200+ emojis expandidos em categorias

## 🆕 FUNCIONALIDADES IMPLEMENTADAS (Janeiro 2025)

### ✅ Sistema de Progresso Inteligente para Dívidas e Metas
- [x] **Recálculo Automático**: Progresso atualizado após qualquer mudança de status
- [x] **Timing Correto**: Recálculo executado APÓS salvar transação (evita race conditions)
- [x] **Validação Segura**: Previne dívidas quitadas incorretamente com total_amount undefined
- [x] **Logs Detalhados**: Sistema de debug completo para rastreamento de problemas
- [x] **Status Flexível**: Funciona para transações settled e pending

### ✅ Sistema Híbrido de Categorias
- [x] **Identificação Especial**: Transações usam categoria especial para identificação
- [x] **Contabilização Padrão**: Gráficos mostram categoria padrão para análise
- [x] **Campos Preparados**: debt_special_category_id e goal_special_category_id
- [x] **Migração Criada**: Novos campos na tabela transactions
- [x] **Compatibilidade**: Sistema funciona com dados existentes

### ✅ Otimizações de Performance e Estabilidade
- [x] **Erros 400 Corrigidos**: Queries Supabase otimizadas
- [x] **Service Worker Robusto**: Tratamento de erros melhorado
- [x] **Manifest.json Corrigido**: Sintaxe e compatibilidade PWA
- [x] **Interfaces Atualizadas**: TypeScript com campos necessários
- [x] **Logs Reduzidos**: Performance melhorada com menos console.log

### ✅ Interface de Categorias Otimizada
- [x] **Filtros Robustos**: Separação clara entre categorias padrão e especiais
- [x] **Ordem Lógica**: Categorias → Faturas → Metas → Dívidas
- [x] **Performance**: Queries eficientes e logs reduzidos
- [x] **Duplicação Eliminada**: Categorias especiais não aparecem duplicadas
- [x] **Compatibilidade**: Funciona com dados históricos

## 🆕 FUNCIONALIDADES IMPLEMENTADAS (Setembro 2025)

### ✅ Interface Mobile Completa
- [x] **Layout Timeline**: Sistema de timeline com pontos coloridos
- [x] **Alinhamento Perfeito**: Linha vertical centralizada com pontos
- [x] **Grid Responsivo**: Sistema de 12 colunas com altura padronizada
- [x] **Seleção Intuitiva**: Checkboxes externos com modo de seleção
- [x] **Ações Compactas**: Botões otimizados para mobile
- [x] **Consistência Visual**: Padrão unificado entre todas as páginas

### ⏳ Sistema de Categorias para Metas e Dívidas (Parcial)
- [x] **Categorização na Criação**: Campo de categoria no formulário
- [x] **Pagamento Automático**: Usa categoria definida automaticamente
- [x] **Contabilização Correta**: Gastos na categoria + progresso individual
- [x] **Migração Automática**: Dados existentes recebem categorias padrão
- [x] **Interface Organizada**: Seleção em grupos lógicos
- [x] **Compatibilidade**: Funciona com dados existentes

### ✅ Correções de Cálculos
- [x] **Gráfico de Categorias**: Cálculo baseado em receitas líquidas
- [x] **Fallback Inteligente**: Se receita = 0, calcula sobre despesas
- [x] **Filtros Corretos**: Dashboard vs Movimentações
- [x] **Exclusão Adequada**: Categorias de fatura e transferências
- [x] **Visual Consistente**: Mesmo estilo entre páginas

## 🚨 PROBLEMAS EM ABERTO (Janeiro 2025)

### ❌ Problema: Categorias não aparecem para despesas de dívidas
**Status**: 🔴 **EM ABERTO** - Investigando
**Descrição**: Quando editando uma despesa de dívida, o campo categoria fica vazio no popup de edição
**Impacto**: Usuário não consegue ver/alterar categoria de pagamentos de dívidas
**Logs Identificados**:
- `[DESPESAS] CategorySelect props: Object` (logs truncados)
- `[CATEGORY_SELECT] Categorias padrão: 24` (sempre mostra categorias padrão)
- `isDebtPayment` sempre `false` nos logs

**Tentativas de Correção**:
1. ✅ **Detecção de Dívidas**: Implementada lógica para detectar `editingDespesa.debt_id`
2. ✅ **Logs Detalhados**: Adicionados logs para debug da detecção
3. ❌ **Resultado**: Ainda não funciona - `isDebtPayment` permanece `false`

**Próximos Passos**:
- [ ] Analisar logs detalhados para identificar por que `isDebtPayment` é `false`
- [ ] Verificar se `editingDespesa.debt_id` está sendo passado corretamente
- [ ] Testar lógica de detecção com dados reais de dívidas
- [ ] Implementar fallback se detecção automática falhar

### ❌ Problema: Edição inline não funciona em despesas
**Status**: 🔴 **EM ABERTO** - Parcialmente resolvido
**Descrição**: Clicar diretamente nas células da tabela não ativa o modo de edição
**Impacto**: Usuário precisa usar botão "Editar" em vez de clicar na célula
**Logs Identificados**:
- `[DESPESAS] handleInlineUpdate chamado: Object` (funciona)
- `[DESPESAS] Transação sem debt_id - atualização normal` (funciona)

**Tentativas de Correção**:
1. ✅ **Remoção de Condicionais**: Removidas condições `selectionMode` dos `InlineEdit`
2. ✅ **onClick Handlers**: Adicionados handlers para ativar edição
3. ❌ **Resultado**: Ainda não funciona - cliques não ativam edição

**Próximos Passos**:
- [ ] Verificar se `InlineEdit` components têm `onClick` funcionando
- [ ] Testar se `selectionMode` está interferindo
- [ ] Implementar debug visual para identificar problema
- [ ] Considerar alternativa de edição direta

### ❌ Problema: Realtime Sync com loops infinitos
**Status**: 🟡 **PARCIALMENTE RESOLVIDO** - Melhorado mas ainda ocorre
**Descrição**: `useRealtimeSync` causa loops de reconexão
**Impacto**: Performance degradada e logs excessivos
**Logs Identificados**:
- "Cleaning up", "Subscription status changed", "Setting up" repetidos
- `setupAttemptsRef.current` atingindo limite máximo

**Tentativas de Correção**:
1. ✅ **Dependências Corretas**: Corrigidas dependências do `useEffect`
2. ✅ **Debounce no Setup**: Implementado debounce de 300ms
3. ✅ **Detecção de Loops**: Adicionado contador e alerta de loop
4. ✅ **useMemo**: Implementado para evitar recriação de hooks
5. 🟡 **Resultado**: Melhorado mas ainda ocorre ocasionalmente

**Próximos Passos**:
- [ ] Monitorar logs para identificar padrões de loop
- [ ] Implementar backoff exponencial para reconexões
- [ ] Considerar desabilitar realtime temporariamente se necessário
- [ ] Otimizar `useMultiTableSync` para evitar múltiplas instâncias

### ❌ Problema: Erros 400 no Supabase
**Status**: 🟡 **PARCIALMENTE RESOLVIDO** - Reduzido mas ainda ocorre
**Descrição**: Queries Supabase retornam erro 400 (Bad Request)
**Impacto**: Algumas funcionalidades falham ocasionalmente
**Logs Identificados**:
- `Failed to load resource: the server responded with a status of 400 ()`
- `tenant_id=eq.null` em algumas queries
- `profiles?select=push_subscription` falhando

**Tentativas de Correção**:
1. ✅ **Validação de tenantId**: Adicionadas verificações de `tenantId` válido
2. ✅ **Fallbacks**: Implementados fallbacks para queries falhando
3. 🟡 **Resultado**: Reduzido mas ainda ocorre em algumas situações

**Próximos Passos**:
- [ ] Investigar queries com `tenant_id=eq.null`
- [ ] Implementar retry automático para queries falhando
- [ ] Verificar se `push_subscription` é campo obrigatório
- [ ] Adicionar validação mais robusta de dados

### ❌ Problema: Cálculo incorreto de progresso de dívidas
**Status**: 🟡 **PARCIALMENTE RESOLVIDO** - Melhorado mas ainda tem casos
**Descrição**: Dívidas são quitadas incorretamente com pagamentos parciais
**Impacto**: Usuário vê dívida como quitada quando ainda tem saldo
**Logs Identificados**:
- `[DESPESAS] Recálculo de dívida:` com valores incorretos
- Dívidas com `is_concluded: true` mas `paid_amount < total_amount`

**Tentativas de Correção**:
1. ✅ **Filtro por Categoria**: Implementado filtro por `special_category_id`
2. ✅ **Recálculo Automático**: Adicionado recálculo após mudanças
3. ✅ **Validação de Valores**: Implementada validação de `total_amount`
4. 🟡 **Resultado**: Melhorado mas ainda tem casos edge

**Próximos Passos**:
- [ ] Implementar validação mais rigorosa de `total_amount`
- [ ] Adicionar logs detalhados para debug de cálculos
- [ ] Testar casos edge com valores decimais
- [ ] Considerar arredondamento para evitar problemas de precisão

## 📊 RESUMO DOS PROBLEMAS EM ABERTO

### 🔴 Problemas Críticos (2)
1. **Categorias não aparecem para despesas de dívidas** - Impacto alto na UX
2. **Edição inline não funciona** - Impacto médio na produtividade

### 🟡 Problemas de Performance (3)
3. **Realtime Sync com loops infinitos** - Impacto na performance
4. **Erros 400 no Supabase** - Impacto na estabilidade
5. **Cálculo incorreto de progresso de dívidas** - Impacto na precisão

### 📈 Priorização para V1.2.2
**Alta Prioridade**:
- [ ] Corrigir detecção de dívidas no CategorySelect
- [ ] Implementar edição inline funcional

**Média Prioridade**:
- [ ] Otimizar Realtime Sync para evitar loops
- [ ] Corrigir queries Supabase com erro 400

**Baixa Prioridade**:
- [ ] Refinar cálculos de progresso de dívidas

### 🎯 Meta para V1.2.2
**Objetivo**: Resolver 100% dos problemas em aberto
**Prazo**: Próxima sprint (1-2 semanas)
**Critério de Sucesso**: Todos os problemas marcados como ✅ RESOLVIDO