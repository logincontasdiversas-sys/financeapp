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

### ✅ Sistema de Categorias para Metas e Dívidas (100% Completo)
- [x] **Categorização na Criação**: Campo de categoria no formulário de metas/dívidas
- [x] **Pagamento Automático**: Usa categoria definida automaticamente
- [x] **Contabilização Correta**: Gastos ficam na categoria escolhida + progresso individual
- [x] **Migração Automática**: Metas/dívidas existentes recebem categorias padrão
- [x] **Flexibilidade**: Usuário pode editar categoria a qualquer momento
- [x] **Interface Organizada**: Seleção de categorias em grupos lógicos
- [x] **Compatibilidade**: Sistema funciona com dados existentes

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

## 🔧 Scripts e Comandos

### Desenvolvimento
```bash
npm run dev          # Servidor local
npm run build        # Build produção
npm run preview      # Preview build
npm run lint         # ESLint check
```

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

**Última atualização**: Setembro 2025  
**Versão**: 1.1.0 (100% completo)
**Status**: Lançamento V1.1 - Interface mobile otimizada e sistema de categorias completo
**Próximo milestone**: V1.2 - Relatórios avançados e gamificação

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

## 🆕 FUNCIONALIDADES IMPLEMENTADAS (Setembro 2025)

### ✅ Interface Mobile Completa
- [x] **Layout Timeline**: Sistema de timeline com pontos coloridos
- [x] **Alinhamento Perfeito**: Linha vertical centralizada com pontos
- [x] **Grid Responsivo**: Sistema de 12 colunas com altura padronizada
- [x] **Seleção Intuitiva**: Checkboxes externos com modo de seleção
- [x] **Ações Compactas**: Botões otimizados para mobile
- [x] **Consistência Visual**: Padrão unificado entre todas as páginas

### ✅ Sistema de Categorias para Metas e Dívidas
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