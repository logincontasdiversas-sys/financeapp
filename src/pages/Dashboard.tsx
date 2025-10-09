import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, AlertTriangleIcon, User, Eye, EyeOff, ArrowUpIcon, ArrowDownIcon, CreditCard, Building2, Tag, Target, AlertTriangle, Home, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

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
    console.log('[DASHBOARD_DEBUG] useEffect triggered:', {
      hasUser: !!user,
      hasTenantId: !!tenantId,
      dateFilter,
      dateFilterFrom: dateFilter?.from,
      dateFilterTo: dateFilter?.to
    });
    
    if (user && tenantId) {
      loadDashboardData();
    }
  }, [user, tenantId, dateFilter]);

  const handleDateFilterChange = (filter: { from: Date | undefined; to: Date | undefined } | null) => {
    console.log('[DASHBOARD] Date filter changed:', filter);
    setDateFilter(filter);
  };

  // Função para verificar se é o primeiro período de uso do sistema
  const checkIfFirstMonth = async (tenantId: string, startDate: string): Promise<boolean> => {
    try {
      // Buscar a transação mais antiga do sistema
      const { data: oldestTransaction } = await supabase
        .from('transactions')
        .select('date')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: true })
        .limit(1);
      
      if (!oldestTransaction || oldestTransaction.length === 0) {
        // Se não há transações, é o primeiro período
        return true;
      }
      
      // Verificar se o período atual contém a transação mais antiga
      const oldestDate = new Date(oldestTransaction[0].date);
      const currentStart = new Date(startDate);
      const currentEnd = new Date(startDate);
      currentEnd.setMonth(currentEnd.getMonth() + 1);
      currentEnd.setDate(0); // Último dia do período
      
      // Se a transação mais antiga está no período atual, é o primeiro período
      const isFirstMonth = oldestDate >= currentStart && oldestDate <= currentEnd;
      
      console.log('[DASHBOARD_DEBUG] Checking if first period:', {
        startDate,
        oldestDate: oldestDate.toISOString().split('T')[0],
        currentStart: currentStart.toISOString().split('T')[0],
        currentEnd: currentEnd.toISOString().split('T')[0],
        isFirstMonth
      });
      
      return isFirstMonth;
    } catch (error) {
      console.error('[DASHBOARD_DEBUG] Error checking first month:', error);
      return true; // Em caso de erro, assumir primeiro período
    }
  };

  // Função para calcular saldo cumulativo do período anterior (baseado no filtro)
  const getPreviousPeriodBalance = async (tenantId: string, currentStartDate: string, currentEndDate: string): Promise<number> => {
    try {
      // Busca saldo inicial do banco
      const { data: banksData } = await supabase
        .from('banks')
        .select('balance')
        .eq('tenant_id', tenantId);
      
      const totalInitialBankBalance = banksData?.reduce((sum, bank) => sum + Number(bank.balance || 0), 0) || 0;

      // Calcular período anterior baseado no filtro atual
      const currentStart = new Date(currentStartDate);
      const currentEnd = new Date(currentEndDate);
      
      // Calcular duração do período atual
      const periodDuration = currentEnd.getTime() - currentStart.getTime();
      
      // Período anterior = mesmo tamanho, terminando no dia anterior ao início do período atual
      const previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);
      
      const previousStart = new Date(previousEnd);
      previousStart.setTime(previousStart.getTime() - periodDuration);
      
      const startStr = previousStart.toISOString().split('T')[0];
      const endStr = previousEnd.toISOString().split('T')[0];

      console.log('[DASHBOARD_DEBUG] Calculando saldo período anterior:', { 
        currentPeriod: { start: currentStartDate, end: currentEndDate },
        previousPeriod: { start: startStr, end: endStr }
      });

      // Transações desde o início até o final do período anterior (acumulado)
      const { data: previousTransactions, error } = await supabase
        .from('transactions')
        .select('amount, kind, title')
        .eq('tenant_id', tenantId)
        .eq('status', 'settled')
        .lte('date', endStr);

      if (error) {
        console.error('[DASHBOARD_DEBUG] Erro na query:', error);
        return totalInitialBankBalance; // Fallback pro inicial
      }

      // Filtrar transferências entre bancos
      const filteredTransactions = previousTransactions?.filter(item => {
        const title = (item.title || '').toLowerCase();
        const isRealTransfer = (
          title.includes('transferência entre bancos') ||
          title.includes('transferencia entre bancos') ||
          title.includes('transfer between banks') ||
          (title.includes('transferência de') && title.includes('para')) ||
          (title.includes('transferencia de') && title.includes('para'))
        );
        return !isRealTransfer;
      }) || [];

      // Entradas - saídas acumuladas até o final do período anterior
      const entradas = filteredTransactions.filter(t => t.kind === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const saídas = filteredTransactions.filter(t => t.kind === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const saldoAcumulado = totalInitialBankBalance + entradas - saídas;

      console.log('[DASHBOARD_DEBUG] Saldo período anterior calculado:', { 
        totalInitialBankBalance,
        entradas, 
        saídas, 
        saldoAcumulado,
        calculation: `${totalInitialBankBalance} + ${entradas} - ${saídas} = ${saldoAcumulado}`
      });

      return saldoAcumulado;
    } catch (error) {
      console.error('[DASHBOARD_DEBUG] Error calculating previous period balance:', error);
      return 0; // Em caso de erro, retornar 0
    }
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
        console.log('[DASHBOARD_DEBUG] Date filter from ISO:', dateFilter.from.toISOString());
        console.log('[DASHBOARD_DEBUG] Date filter to ISO:', dateFilter.to.toISOString());
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
      console.log('[DASHBOARD_DEBUG] Executing income query with params:', {
        kind: 'income',
        status: 'settled',
        tenantId,
        startDate,
        endDate
      });
      
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
      
      if (incomeError) {
        console.error('[DASHBOARD_DEBUG] Income query error:', incomeError);
      }
      console.log('[DASHBOARD_DEBUG] Date filter being used:', { 
        hasDateFilter: !!dateFilter,
        dateFilterFrom: dateFilter?.from,
        dateFilterTo: dateFilter?.to,
        startDate,
        endDate,
        dateFilterType: typeof dateFilter,
        dateFilterFromType: typeof dateFilter?.from,
        dateFilterToType: typeof dateFilter?.to
      });
      
      // Filtrar transferências entre bancos pelo título (apenas transferências reais entre bancos)
      const filteredIncomeData = (incomeData || []).filter((item: any) => {
        const title = (item?.title || '').toLowerCase();
        
        // Filtros mais específicos para transferências reais entre bancos
        // NÃO filtrar TRANSFERENCIA PIX, apenas transferências entre bancos
        const isRealTransfer = (
          title.includes('transferência entre bancos') ||
          title.includes('transferencia entre bancos') ||
          title.includes('transfer between banks') ||
          (title.includes('transferência de') && title.includes('para')) ||
          (title.includes('transferencia de') && title.includes('para'))
        );
        
        if (isRealTransfer) {
          console.log('[DASHBOARD_DEBUG] 🚫 Excluindo transferência real:', { title: item.title, amount: item.amount });
        }
        
        return !isRealTransfer;
      });
      
      // Debug: verificar se há receitas sem filtro
      console.log('[DASHBOARD_DEBUG] All income data (before filter):', incomeData);
      console.log('[DASHBOARD_DEBUG] Filtered income data (after filter):', filteredIncomeData);
      console.log('[DASHBOARD_DEBUG] Income data length:', incomeData?.length || 0);

      console.log('[DASHBOARD_DEBUG] Filtered income data:', filteredIncomeData);

      // Fetch expense transactions (settled only)
      console.log('[DASHBOARD_DEBUG] Executing expense query with params:', {
        kind: 'expense',
        status: 'settled',
        tenantId,
        startDate,
        endDate
      });
      
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
      
      if (expenseError) {
        console.error('[DASHBOARD_DEBUG] Expense query error:', expenseError);
      }
      
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
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('completed', false);

      if (goalsError) {
        console.error('[DASHBOARD_DEBUG] Goals query error:', goalsError);
      }

      // Fetch all debts and filter by is_concluded (same logic as Dividas page)
      const { data: allDebtsData, error: allDebtsError } = await supabase
        .from('debts')
        .select('id, total_amount, paid_amount, is_concluded, special_category_id, title')
        .eq('tenant_id', tenantId);

      console.log('[DASHBOARD_DEBUG] Todas as dívidas encontradas:', allDebtsData?.map(d => ({
        id: d.id,
        title: d.title,
        total_amount: d.total_amount,
        paid_amount: d.paid_amount,
        is_concluded: d.is_concluded
      })));

      // Recalcular progresso de cada dívida baseado nas transações (mesmo que Dividas page)
      for (const debt of allDebtsData || []) {
        console.log('[DASHBOARD_DEBUG] Recalculando dívida:', debt.id, debt.title);
        
        // Buscar dados da dívida para verificar se foi quitada sem valores
        const { data: debtData } = await supabase
          .from('debts')
          .select('total_amount, settled')
          .eq('id', debt.id)
          .single();

        console.log('[DASHBOARD_DEBUG] Dados da dívida:', {
          title: debt.title,
          total_amount: debtData?.total_amount,
          settled: debtData?.settled
        });

        // Verificar se a dívida foi quitada sem valores (dinheiro, negócios, desconto)
        const isQuitadaSemValores = debtData?.settled === true;
        
        if (isQuitadaSemValores) {
          console.log('[DASHBOARD_DEBUG] ✅ DÍVIDA QUITADA SEM VALORES:', debt.title);
          debt.paid_amount = debtData?.total_amount || 0;
          debt.is_concluded = true;
        } else if (debt.special_category_id) {
          // Buscar transações associadas a esta dívida
          const { data: debtTransactions } = await supabase
            .from('transactions')
            .select('amount, status')
            .eq('tenant_id', tenantId)
            .eq('kind', 'expense')
            .eq('debt_id', debt.id)
            .eq('category_id', debt.special_category_id)
            .eq('status', 'settled');

          const newPaidAmount = debtTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
          const isFullyPaid = debtData?.total_amount ? newPaidAmount >= debtData.total_amount : false;
          
          console.log('[DASHBOARD_DEBUG] Transações encontradas:', debtTransactions?.length || 0);
          console.log('[DASHBOARD_DEBUG] Valor pago calculado:', newPaidAmount);
          console.log('[DASHBOARD_DEBUG] Total da dívida:', debtData?.total_amount);
          console.log('[DASHBOARD_DEBUG] Está totalmente paga:', isFullyPaid);

          // Atualizar o objeto da dívida
          debt.paid_amount = newPaidAmount;
          debt.is_concluded = isFullyPaid;
        }
      }

      // Filter only non-concluded debts (same as Dividas page)
      let debtsData = allDebtsData?.filter(debt => !debt.is_concluded) || [];
      
      console.log('[DASHBOARD_DEBUG] Dívidas filtradas (is_concluded = false):', debtsData.map(d => ({
        id: d.id,
        title: d.title,
        total_amount: d.total_amount,
        paid_amount: d.paid_amount,
        is_concluded: d.is_concluded
      })));
      
        console.log('[DASHBOARD_DEBUG] TÍTULOS DAS DÍVIDAS PENDENTES:', debtsData.map(d => d.title));
        
        // Log detalhado de cada dívida pendente
        console.log('[DASHBOARD_DEBUG] === DETALHES DAS DÍVIDAS PENDENTES ===');
        debtsData.forEach((debt, index) => {
          console.log(`[DASHBOARD_DEBUG] Dívida ${index + 1}:`, {
            id: debt.id,
            title: debt.title,
            total_amount: debt.total_amount,
            paid_amount: debt.paid_amount,
            is_concluded: debt.is_concluded,
            progress: debt.total_amount ? ((debt.paid_amount / debt.total_amount) * 100).toFixed(2) + '%' : 'N/A'
          });
        });
        console.log('[DASHBOARD_DEBUG] === FIM DETALHES ===');

      if (allDebtsError) {
        console.error('[DASHBOARD_DEBUG] Debts query error:', allDebtsError);
      }

      // Log detalhado das dívidas encontradas
      console.log('[DASHBOARD_DEBUG] Dívidas encontradas:', {
        total: debtsData?.length || 0,
        debts: debtsData?.map(debt => ({
          id: debt.id,
          total_amount: debt.total_amount,
          paid_amount: debt.paid_amount,
          is_concluded: debt.is_concluded,
          progress: debt.total_amount > 0 ? ((debt.paid_amount || 0) / debt.total_amount * 100).toFixed(1) + '%' : '0%'
        }))
      });

      // Log individual de cada dívida para debug
      if (debtsData && debtsData.length > 0) {
        console.log('[DASHBOARD_DEBUG] === DETALHES DAS DÍVIDAS ===');
        debtsData.forEach((debt, index) => {
          console.log(`[DASHBOARD_DEBUG] Dívida ${index + 1}:`, {
            id: debt.id,
            total_amount: debt.total_amount,
            paid_amount: debt.paid_amount,
            is_concluded: debt.is_concluded,
            progress: debt.total_amount > 0 ? ((debt.paid_amount || 0) / debt.total_amount * 100).toFixed(1) + '%' : '0%',
            shouldShow: !debt.is_concluded
          });
        });
        console.log('[DASHBOARD_DEBUG] === FIM DETALHES ===');
      }

      // Fetch banks to get initial balances
      const { data: banksData, error: banksError } = await supabase
        .from('banks')
        .select('balance')
        .eq('tenant_id', tenantId);

      if (banksError) {
        console.error('[DASHBOARD_DEBUG] Banks query error:', banksError);
      }

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
      
      console.log('[DASHBOARD_DEBUG] Detailed calculation:', {
        totalReceitas: totalReceitas,
        totalDespesas: totalDespesas,
        totalReceitasType: typeof totalReceitas,
        totalDespesasType: typeof totalDespesas,
        isNaNReceitas: isNaN(totalReceitas),
        isNaNDespesas: isNaN(totalDespesas)
      });
      
      // Saldo inicial dos bancos (usado APENAS no primeiro mês de uso do sistema)
      const totalInitialBankBalance = banksData?.reduce((sum, bank) => sum + Number(bank.balance || 0), 0) || 0;
      
      // Verificar se é o primeiro mês de uso do sistema
      // O primeiro mês é aquele que contém a transação mais antiga
      const isFirstMonth = await checkIfFirstMonth(tenantId, startDate);
      
      let totalBalance: number;
      let prevMonthBalance: number;
      
      if (isFirstMonth) {
        // PRIMEIRO MÊS: Saldo inicial + receitas - despesas do período
        // O saldo inicial é usado APENAS uma vez, no primeiro mês
        totalBalance = totalInitialBankBalance + totalReceitas - totalDespesas;
        prevMonthBalance = totalInitialBankBalance;
        
        console.log('[DASHBOARD_DEBUG] FIRST MONTH calculation:', {
          totalInitialBankBalance,
          totalReceitas,
          totalDespesas,
          totalBalance,
          calculation: `${totalInitialBankBalance} + ${totalReceitas} - ${totalDespesas} = ${totalBalance}`,
          note: 'FIRST MONTH: initial balance + period transactions (initial balance used only once)'
        });
      } else {
        // MESES SUBSEQUENTES: Calcular o saldo final do período anterior
        const previousPeriodBalance = await getPreviousPeriodBalance(tenantId, startDate, endDate);
        totalBalance = previousPeriodBalance + totalReceitas - totalDespesas;
        prevMonthBalance = previousPeriodBalance;
        
      console.log('[DASHBOARD_DEBUG] SUBSEQUENT PERIOD calculation:', {
        previousPeriodBalance,
        totalReceitas,
        totalDespesas,
        totalBalance,
        calculation: `${previousPeriodBalance} + ${totalReceitas} - ${totalDespesas} = ${totalBalance}`,
        note: 'SUBSEQUENT PERIOD: previous period final balance + current period transactions'
      });
      }
      
      console.log('[DASHBOARD_DEBUG] Final calculation:', {
        isFirstMonth,
        initialBalance: totalInitialBankBalance,
        previousBalance: prevMonthBalance,
        periodBalance: totalBalance,
        totalReceitas,
        totalDespesas,
        incomeCount: filteredIncomeData?.length || 0,
        expenseCount: expenseData?.length || 0
      });
      
      console.log('[DASHBOARD_DEBUG] Previous month balance:', {
        prevMonthBalance
      });

      const newStats = {
        totalReceitas,
        totalDespesas,
        saldo: totalBalance,
        saldoMesPassado: prevMonthBalance,
        metasAtivas: goalsData?.length || 0,
        dividasAbertas: debtsData?.length || 0,
      };
      
      console.log('[DASHBOARD_DEBUG] Setting new stats:', newStats);
      
      setStats(newStats);
      
    } catch (error) {
      console.error('[DASHBOARD_DEBUG] Error loading data:', error);
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
          {/* Versão Mobile - Header com ícones */}
          <div className="block sm:hidden">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" className="p-2">
                <User className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2"
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                >
                  {isBalanceVisible ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </Button>
                <PDFReportButton />
              </div>
            </div>
            <div className="flex flex-col space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">
                  Visão geral das suas finanças
                </p>
              </div>
              <DateFilter 
                onFilterChange={handleDateFilterChange}
                value={dateFilter}
                className="w-full"
              />
            </div>
          </div>

          {/* Versão Desktop - Header original */}
          <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                Visão geral das suas finanças
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <DateFilter 
                onFilterChange={handleDateFilterChange}
                value={dateFilter}
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
        isBalanceVisible={isBalanceVisible}
      />

      {/* Botões de Ação Rápida - Versão Mobile */}
      <div className="block sm:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-3">
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <ArrowUpIcon className="h-5 w-5 text-green-600" />
                <span className="text-xs">Receitas</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <ArrowDownIcon className="h-5 w-5 text-red-600" />
                <span className="text-xs">Despesas</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span className="text-xs">Cartões</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <Building2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs">Bancos</span>
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <Tag className="h-5 w-5 text-orange-600" />
                <span className="text-xs">Categorias</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <Target className="h-5 w-5 text-indigo-600" />
                <span className="text-xs">Metas</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-xs">Dívidas</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-16">
                <Home className="h-5 w-5 text-gray-600" />
                <span className="text-xs">Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Mensal de Receitas e Despesas */}
        <MonthlyChart 
          title="Evolução das Receitas e Despesas" 
        />

      {/* Seção de Bancos */}
      <BanksSection 
        startDate={dateFilter?.from}
        endDate={dateFilter?.to}
      />

      {/* Seção de Cartões de Crédito */}
      <CreditCardsSection 
        startDate={dateFilter?.from}
        endDate={dateFilter?.to}
      />

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

      {/* Barra de Navegação Inferior - Versão Mobile - Deploy Fix */}
      <div className="block sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="flex justify-around items-center">
          <Button variant="ghost" className="flex flex-col items-center gap-1 h-16 w-16">
            <Home className="h-5 w-5 text-primary" />
            <span className="text-xs text-primary font-medium">Dashboard</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center gap-1 h-16 w-16">
            <ArrowUpIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Receitas</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center gap-1 h-16 w-16">
            <ArrowDownIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Despesas</span>
          </Button>
        </div>
      </div>

      {/* Comentário para forçar deploy - Versão Bancária Completa */}

      {/* Espaçamento para a barra inferior fixa */}
      <div className="block sm:hidden h-20"></div>
    </div>
  );
};

export default Dashboard;