import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Building2, DollarSign, Activity, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface BankAnalyticsData {
  bankId: string;
  bankName: string;
  currentBalance: number;
  initialBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netMovement: number;
  transactionCount: number;
  avgTransactionValue: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    balance: number;
    income: number;
    expenses: number;
  }>;
  dailyActivity: Array<{
    day: string;
    transactions: number;
    amount: number;
  }>;
}

interface BankAnalyticsProps {
  bankId?: string; // Se não fornecido, mostra análise de todos os bancos
}

const BankAnalytics = ({ bankId }: BankAnalyticsProps) => {
  const { tenantId } = useTenant();
  const [analyticsData, setAnalyticsData] = useState<BankAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | 'max'>('max');

  useEffect(() => {
    if (tenantId) {
      loadAnalytics();
    }
  }, [tenantId, selectedPeriod, bankId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('[BANK_ANALYTICS] Starting to load analytics...');
      
      // Buscar bancos
      const { data: banks, error: banksError } = await supabase
        .from('banks')
        .select('id, name, balance')
        .eq('tenant_id', tenantId);

      if (banksError) {
        console.error('[BANK_ANALYTICS] Error fetching banks:', banksError);
        return;
      }

      console.log('[BANK_ANALYTICS] Banks found:', banks?.length || 0);
      if (!banks || banks.length === 0) {
        console.log('[BANK_ANALYTICS] No banks found');
        setAnalyticsData([]);
        return;
      }

      const analytics: BankAnalyticsData[] = [];

      for (const bank of banks) {
        if (bankId && bank.id !== bankId) continue;
        
        console.log(`[BANK_ANALYTICS] Processing bank: ${bank.name} (${bank.id})`);

        // Calcular período
        const endDate = new Date();
        const startDate = new Date();
        
        switch (selectedPeriod) {
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case 'max':
            // Para período máximo, não definimos startDate (pega todo o histórico)
            startDate = new Date('1900-01-01'); // Data muito antiga para pegar tudo
            break;
        }

        // Buscar transações do banco
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select(`
            amount, 
            kind, 
            status, 
            date,
            categories(name, emoji)
          `)
          .eq('tenant_id', tenantId)
          .eq('bank_id', bank.id)
          .eq('status', 'settled')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (transactionsError) {
          console.error(`[BANK_ANALYTICS] Error fetching transactions for bank ${bank.name}:`, transactionsError);
        }

        if (!transactions || transactions.length === 0) {
          console.log(`[BANK_ANALYTICS] No transactions found for bank ${bank.name}`);
          // Continuar mesmo sem transações para mostrar o banco
        }

        // Calcular métricas
        const monthlyIncome = (transactions || [])
          .filter(t => t.kind === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = (transactions || [])
          .filter(t => t.kind === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const netMovement = monthlyIncome - monthlyExpenses;
        const transactionCount = (transactions || []).length;
        const avgTransactionValue = transactionCount > 0 ? (monthlyIncome + monthlyExpenses) / transactionCount : 0;

        // Top categorias
        const categoryMap = new Map<string, number>();
        (transactions || [])
          .filter(t => t.kind === 'expense' && t.categories)
          .forEach(t => {
            const categoryName = t.categories.name;
            categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + t.amount);
          });

        const topCategories = Array.from(categoryMap.entries())
          .map(([name, amount]) => ({
            name,
            amount,
            percentage: monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        // Tendência mensal (últimos 6 meses)
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

          const monthTransactions = (transactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate >= monthStart && tDate <= monthEnd;
          });

          const monthIncome = monthTransactions
            .filter(t => t.kind === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

          const monthExpenses = monthTransactions
            .filter(t => t.kind === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          monthlyTrend.push({
            month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
            balance: bank.balance + (monthlyIncome - monthlyExpenses),
            income: monthIncome,
            expenses: monthExpenses
          });
        }

        // Atividade diária (últimos 7 dias)
        const dailyActivity = [];
        for (let i = 6; i >= 0; i--) {
          const dayDate = new Date();
          dayDate.setDate(dayDate.getDate() - i);
          const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1);

          const dayTransactions = (transactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate >= dayStart && tDate < dayEnd;
          });

          dailyActivity.push({
            day: dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }),
            transactions: dayTransactions.length,
            amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0)
          });
        }

        const bankData = {
          bankId: bank.id,
          bankName: bank.name,
          currentBalance: bank.balance,
          initialBalance: bank.balance,
          monthlyIncome,
          monthlyExpenses,
          netMovement,
          transactionCount,
          avgTransactionValue,
          topCategories,
          monthlyTrend,
          dailyActivity
        };
        
        console.log(`[BANK_ANALYTICS] Bank data for ${bank.name}:`, {
          transactions: transactionCount,
          income: monthlyIncome,
          expenses: monthlyExpenses,
          categories: topCategories.length
        });
        
        analytics.push(bankData);
      }

      console.log('[BANK_ANALYTICS] Final analytics data:', analytics);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('[BANK_ANALYTICS] Error loading analytics:', error);
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

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
  };

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (analyticsData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-muted-foreground">
            Adicione transações para ver as análises dos seus bancos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resumo Detalhado dos Bancos (Histórico Completo)</h3>
      </div>

      {/* Resumo Detalhado */}
      <div className="grid gap-4 md:grid-cols-2">
        {analyticsData.map((bank) => (
          <Card key={bank.bankId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {bank.bankName} - Resumo Detalhado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">Receitas</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(bank.monthlyIncome)}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">Despesas</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(bank.monthlyExpenses)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de Transações</span>
                  <span className="text-sm font-medium">{bank.transactionCount}</span>
                </div>
              </div>

              {bank.topCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Categorias</h4>
                  <div className="space-y-1">
                    {bank.topCategories.slice(0, 3).map((category, index) => (
                      <div key={category.name} className="flex justify-between items-center">
                        <span className="text-sm">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {category.percentage.toFixed(1)}%
                          </Badge>
                          <span className="text-sm font-medium">{formatCurrency(category.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BankAnalytics;
