import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, AlertTriangleIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { BanksSection } from "@/components/dashboard/BanksSection";
import { CreditCardsSection } from "@/components/dashboard/CreditCardsSection";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { CategorySpending } from "@/components/dashboard/CategorySpending";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { logger } from "@/utils/logger";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { getCurrentDateBrasilia } from "@/utils/dateUtils";

interface DashboardStats {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  saldoMesPassado: number;
  metasAtivas: number;
  dividasAbertas: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    saldoMesPassado: 0,
    metasAtivas: 0,
    dividasAbertas: 0,
  });
  const [loading, setLoading] = useState(true);

  // Realtime sync para atualizar o dashboard em tempo real
  useRealtimeSync({
    table: 'transactions',
    onInsert: () => {
      logger.info('DASHBOARD_REALTIME', 'Nova transação detectada');
      loadDashboardData();
    },
    onUpdate: () => {
      logger.info('DASHBOARD_REALTIME', 'Transação atualizada detectada');
      loadDashboardData();
    },
    onDelete: () => {
      logger.info('DASHBOARD_REALTIME', 'Transação removida detectada');
      loadDashboardData();
    },
  });

  useRealtimeSync({
    table: 'banks',
    onInsert: () => loadDashboardData(),
    onUpdate: () => loadDashboardData(),
    onDelete: () => loadDashboardData(),
  });

  useRealtimeSync({
    table: 'goals',
    onInsert: () => loadDashboardData(),
    onUpdate: () => loadDashboardData(),
    onDelete: () => loadDashboardData(),
  });

  useRealtimeSync({
    table: 'debts',
    onInsert: () => loadDashboardData(),
    onUpdate: () => loadDashboardData(),
    onDelete: () => loadDashboardData(),
  });

  useEffect(() => {
    if (user && tenantId) {
      loadDashboardData();
    }
  }, [user, tenantId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('[DASHBOARD_DEBUG] User:', user);
      console.log('[DASHBOARD_DEBUG] Tenant ID:', tenantId);
      
      // Get current month transactions using Brasília timezone
      const now = new Date();
      const brasiliaDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      
      const startOfMonth = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth(), 1);
      const startDate = startOfMonth.toISOString().split('T')[0];
      
      const endOfMonth = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth() + 1, 0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      console.log('[DASHBOARD_DEBUG] Date range:', { startDate, endDate });

      // Fetch income transactions (settled only, excluding transfers)
      const { data: incomeData, error: incomeError } = await supabase
        .from('transactions')
        .select(`
          amount, 
          status,
          categories(name)
        `)
        .eq('kind', 'income')
        .eq('status', 'settled')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate);

      console.log('[DASHBOARD_DEBUG] Income query result:', { incomeData, incomeError });
      
      // Debug: verificar se há receitas sem filtro de categoria
      const { data: allIncomeData, error: allIncomeError } = await supabase
        .from('transactions')
        .select('amount, status, title, categories(name)')
        .eq('kind', 'income')
        .eq('status', 'settled')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate);
      
      console.log('[DASHBOARD_DEBUG] All income data (no category filter):', { allIncomeData, allIncomeError });

      // Filtrar transferências no código JavaScript
      const filteredIncomeData = incomeData?.filter(transaction => 
        transaction.categories?.name !== 'Transferência entre Bancos'
      ) || [];

      console.log('[DASHBOARD_DEBUG] Filtered income data:', filteredIncomeData);

      // Fetch expense transactions (settled only)
      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('amount, status')
        .eq('kind', 'expense')
        .eq('status', 'settled')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate);

      console.log('[DASHBOARD_DEBUG] Expense query result:', { expenseData, expenseError });

      // Fetch active goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('completed', false);

      // Fetch open debts
      const { data: debtsData } = await supabase
        .from('debts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('settled', false);

      // Fetch banks to get initial balances
      const { data: banksData } = await supabase
        .from('banks')
        .select('balance')
        .eq('tenant_id', tenantId);

      // Calculate totals for settled transactions only
      const totalReceitas = filteredIncomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalDespesas = expenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      
      // Calculate cumulative balance from the beginning until current month using Brasília timezone
      const currentYear = brasiliaDate.getFullYear();
      const currentMonth = brasiliaDate.getMonth();
      
      // Get all transactions from the beginning until current month (including transfers for balance calculation)
      const { data: allTransactionsUntilNow } = await supabase
        .from('transactions')
        .select(`
          amount, 
          kind, 
          status, 
          date
        `)
        .eq('tenant_id', tenantId)
        .lte('date', endDate) // All transactions until end of current month
        .order('date', { ascending: true });

      // Calculate cumulative balance: initial bank balance + all historical transactions
      const totalInitialBankBalance = banksData?.reduce((sum, bank) => sum + Number(bank.balance || 0), 0) || 0;
      let cumulativeBalance = totalInitialBankBalance;
      
      console.log('[DASHBOARD_DEBUG] Initial bank balance:', totalInitialBankBalance);
      console.log('[DASHBOARD_DEBUG] All transactions count:', allTransactionsUntilNow?.length || 0);
      
      if (allTransactionsUntilNow) {
        allTransactionsUntilNow.forEach(transaction => {
          if (transaction.status === 'settled') {
            if (transaction.kind === 'income') {
              cumulativeBalance += Number(transaction.amount);
            } else if (transaction.kind === 'expense') {
              cumulativeBalance -= Number(transaction.amount);
            }
          }
        });
      }
      
      // Total balance = cumulative balance from beginning until now
      const totalBalance = cumulativeBalance;
      
      console.log('[DASHBOARD_DEBUG] Final balance calculation:', {
        initialBalance: totalInitialBankBalance,
        finalBalance: totalBalance,
        totalReceitas,
        totalDespesas
      });

      // Calculate previous month's balance using Brasília timezone
      const previousMonth = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth() - 1, 1);
      const prevMonthEndDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);
      const prevMonthEndDateStr = prevMonthEndDate.toISOString().split('T')[0];

      const { data: prevMonthTransactions } = await supabase
        .from('transactions')
        .select('amount, kind, status, payment_method')
        .lte('date', prevMonthEndDateStr)
        .order('date', { ascending: true });

      let prevMonthBalance = totalInitialBankBalance;
      if (prevMonthTransactions) {
        prevMonthTransactions.forEach(transaction => {
          if (transaction.status === 'settled') {
            if (transaction.kind === 'income') {
              prevMonthBalance += Number(transaction.amount);
            } else if (transaction.kind === 'expense' && transaction.payment_method !== 'credit_card') {
              prevMonthBalance -= Number(transaction.amount);
            }
          }
        });
      }

      setStats({
        totalReceitas,
        totalDespesas,
        saldo: totalBalance,
        saldoMesPassado: prevMonthBalance,
        metasAtivas: goalsData?.length || 0,
        dividasAbertas: debtsData?.length || 0,
      });
      
    } catch (error) {
      logger.error('DASHBOARD', 'Error loading data', { error });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted rounded"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral das suas finanças
          </p>
        </div>
      </div>

      {/* Seção de Resumo Financeiro */}
      <FinancialSummary 
        totalReceitas={stats.totalReceitas}
        totalDespesas={stats.totalDespesas}
        saldo={stats.saldo}
        saldoMesPassado={stats.saldoMesPassado}
        loading={loading}
      />

      {/* Gráfico Mensal de Receitas e Despesas */}
      <MonthlyChart title="Evolução das Receitas e Despesas" />

      {/* Seção de Bancos e Cartões */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <BanksSection />
        <CreditCardsSection />
      </div>

      {/* Seção de Histórico de Movimentação */}
      <TransactionHistory />

      {/* Seção de Gastos por Categorias */}
      <CategorySpending />

      {/* Seção de Gráfico de Pizza das Categorias */}
      <CategoryPieChart />

      {/* Seção de Calendário */}
      <CalendarSection />

      {/* Cards de Metas e Dívidas */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
                <div>
                  <p className="text-sm font-medium text-foreground">Status Financeiro</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.saldo >= 0 ? 'Positivo' : 'Negativo'}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  stats.saldo >= 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                }`}>
                  {stats.saldo >= 0 ? '📈' : '📉'}
                </div>
              </div>
              
              {/* Metas e Dívidas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-card border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Metas Ativas</p>
                      <p className="text-2xl font-bold text-primary">{stats.metasAtivas}</p>
                    </div>
                    <TrendingUpIcon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-card border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Dívidas Abertas</p>
                      <p className="text-2xl font-bold text-warning">{stats.dividasAbertas}</p>
                    </div>
                    <AlertTriangleIcon className="h-8 w-8 text-warning" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.dividasAbertas > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning text-warning-foreground border border-warning/20">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{stats.dividasAbertas} dívidas pendentes</span>
                </div>
              )}
              {stats.saldo < 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive text-destructive-foreground border border-destructive/20">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Saldo negativo este mês</span>
                </div>
              )}
              {stats.metasAtivas === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground border border-primary/20">
                  <TrendingUpIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Nenhuma meta ativa</span>
                </div>
              )}
              {stats.dividasAbertas === 0 && stats.saldo >= 0 && stats.metasAtivas > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success text-success-foreground border border-success/20">
                  <TrendingUpIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Tudo sob controle! 🎉</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;