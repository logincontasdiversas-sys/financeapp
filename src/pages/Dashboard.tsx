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
import { PDFReportButton } from "@/components/dashboard/PDFReportButton";
import { DateFilter } from "@/components/ui/date-filter";
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
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);

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
  }, [user, tenantId, dateFilter]);

  const handleDateFilterChange = (filter: { from: Date | undefined; to: Date | undefined } | null) => {
    setDateFilter(filter);
  };

  const loadDashboardData = async () => {
    if (!user || !tenantId) {
      return;
    }
    try {
      setLoading(true);
      
      console.log('[DASHBOARD_DEBUG] User:', user);
      console.log('[DASHBOARD_DEBUG] Tenant ID:', tenantId);
      
      // Use date filter if available, otherwise use current month
      let startDate: string;
      let endDate: string;
      
      if (dateFilter && dateFilter.from && dateFilter.to) {
        startDate = dateFilter.from.toISOString().split('T')[0];
        endDate = dateFilter.to.toISOString().split('T')[0];
        console.log('[DASHBOARD_DEBUG] Using date filter:', { startDate, endDate });
        console.log('[DASHBOARD_DEBUG] Date filter object:', dateFilter);
        console.log('[DASHBOARD_DEBUG] Date filter from:', dateFilter.from);
        console.log('[DASHBOARD_DEBUG] Date filter to:', dateFilter.to);
      } else {
        // Get current month transactions using Brasília timezone
        const now = new Date();
        const brasiliaDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        
        const startOfMonth = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        startDate = startOfMonth.toISOString().split('T')[0];
        
        const endOfMonth = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        endDate = endOfMonth.toISOString().split('T')[0];
        
        console.log('[DASHBOARD_DEBUG] Using current month (Brasília - normalized):', { 
          now: now.toISOString(),
          brasiliaDate: brasiliaDate.toISOString(),
          startDate, 
          endDate,
          brasiliaYear: brasiliaDate.getFullYear(),
          brasiliaMonth: brasiliaDate.getMonth() + 1,
          startOfMonthISO: startOfMonth.toISOString(),
          endOfMonthISO: endOfMonth.toISOString()
        });
      }

      // Fetch income transactions (settled only, excluding transfers)
      const { data: incomeData, error: incomeError } = await supabase
        .from('transactions')
        .select(`
          amount, 
          status,
          title
        `)
        .eq('kind', 'income')
        .eq('status', 'settled')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate);

      console.log('[DASHBOARD_DEBUG] Income query result:', { incomeData, incomeError });
      console.log('[DASHBOARD_DEBUG] Income query params:', { 
        kind: 'income', 
        status: 'settled', 
        tenantId, 
        startDate, 
        endDate 
      });
      console.log('[DASHBOARD_DEBUG] Date filter being used:', { 
        hasDateFilter: !!dateFilter,
        dateFilterFrom: dateFilter?.from,
        dateFilterTo: dateFilter?.to,
        startDate,
        endDate
      });
      
      // Temporariamente desabilitar filtro de transferências para debug
      const filteredIncomeData = incomeData || [];
      
      // Debug: verificar se há receitas sem filtro
      console.log('[DASHBOARD_DEBUG] All income data (before filter):', incomeData);
      console.log('[DASHBOARD_DEBUG] Filtered income data (after filter):', filteredIncomeData);
      console.log('[DASHBOARD_DEBUG] Income data length:', incomeData?.length || 0);

      console.log('[DASHBOARD_DEBUG] Filtered income data:', filteredIncomeData);

      // Fetch expense transactions (settled only)
      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('amount, status, title')
        .eq('kind', 'expense')
        .eq('status', 'settled')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate);

      console.log('[DASHBOARD_DEBUG] Expense query result:', { expenseData, expenseError });
      console.log('[DASHBOARD_DEBUG] Expense query params:', { 
        kind: 'expense', 
        status: 'settled', 
        tenantId, 
        startDate, 
        endDate 
      });
      
      // Log individual expense transactions
      if (expenseData) {
        console.log('[DASHBOARD_DEBUG] Expense data length:', expenseData.length);
        expenseData.forEach((t, index) => {
          console.log(`[DASHBOARD_DEBUG] Expense transaction ${index}:`, { title: t.title, amount: t.amount });
        });
      } else {
        console.log('[DASHBOARD_DEBUG] No expense data found');
      }

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
      const totalReceitas = filteredIncomeData?.reduce((sum, item) => {
        const amount = Number(item.amount);
        console.log('[DASHBOARD_DEBUG] Adding income:', { title: item.title, amount, sum });
        return sum + amount;
      }, 0) || 0;
      
      const totalDespesas = expenseData?.reduce((sum, item) => {
        const amount = Number(item.amount);
        console.log('[DASHBOARD_DEBUG] Adding expense:', { title: item.title, amount, sum });
        return sum + amount;
      }, 0) || 0;
      
      console.log('[DASHBOARD_DEBUG] Calculated totals:', {
        totalReceitas,
        totalDespesas,
        filteredIncomeDataCount: filteredIncomeData?.length || 0,
        expenseDataCount: expenseData?.length || 0
      });
      
      // Simplificar cálculo do saldo para usar apenas o período filtrado
      const totalInitialBankBalance = banksData?.reduce((sum, bank) => sum + Number(bank.balance || 0), 0) || 0;
      
      // Calcular saldo baseado apenas no período filtrado
      const totalBalance = totalInitialBankBalance + totalReceitas - totalDespesas;
      
      console.log('[DASHBOARD_DEBUG] Simplified balance calculation:', {
        totalInitialBankBalance,
        totalReceitas,
        totalDespesas,
        totalBalance
      });
      
      console.log('[DASHBOARD_DEBUG] Final balance calculation:', {
        initialBalance: totalInitialBankBalance,
        finalBalance: totalBalance,
        totalReceitas,
        totalDespesas,
        allTransactionsCount: allTransactionsUntilNow?.length || 0
      });

      // Simplificar cálculo do saldo do mês passado
      const prevMonthBalance = totalInitialBankBalance;
      
      console.log('[DASHBOARD_DEBUG] Previous month balance:', {
        prevMonthBalance
      });

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
      {/* Filtro por Período */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                Visão geral das suas finanças
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <DateFilter 
                onFilterChange={handleDateFilterChange}
                className="sm:max-w-md"
              />
              <PDFReportButton />
            </div>
          </div>
        </CardHeader>
      </Card>

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
        <BanksSection 
          startDate={dateFilter?.from}
          endDate={dateFilter?.to}
        />
        <CreditCardsSection 
          startDate={dateFilter?.from}
          endDate={dateFilter?.to}
        />
      </div>

      {/* Seção de Histórico de Movimentação */}
      <TransactionHistory 
        startDate={dateFilter?.from}
        endDate={dateFilter?.to}
      />

      {/* Seção de Gastos por Categorias */}
      <CategorySpending 
        startDate={dateFilter?.from}
        endDate={dateFilter?.to}
      />

      {/* Seção de Gráfico de Pizza das Categorias */}
      <CategoryPieChart 
        startDate={dateFilter?.from}
        endDate={dateFilter?.to}
      />

      {/* Seção de Calendário */}
      <CalendarSection 
        startDate={dateFilter?.from}
        endDate={dateFilter?.to}
      />

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