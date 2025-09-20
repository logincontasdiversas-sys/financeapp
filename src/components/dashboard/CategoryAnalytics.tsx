import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Tag, DollarSign, Activity, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface CategoryAnalyticsData {
  categoryId: string;
  categoryName: string;
  emoji: string;
  totalSpent: number;
  transactionCount: number;
  avgTransactionValue: number;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    transactions: number;
  }>;
  dailyActivity: Array<{
    day: string;
    amount: number;
    transactions: number;
  }>;
  topBanks: Array<{
    bankName: string;
    amount: number;
    percentage: number;
  }>;
  growthRate: number; // Comparação com mês anterior
}

interface CategoryAnalyticsProps {
  categoryId?: string; // Se não fornecido, mostra análise de todas as categorias
}

const CategoryAnalytics = ({ categoryId }: CategoryAnalyticsProps) => {
  const { tenantId } = useTenant();
  const [analyticsData, setAnalyticsData] = useState<CategoryAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | 'max'>('max');

  useEffect(() => {
    if (tenantId) {
      loadAnalytics();
    }
  }, [tenantId, selectedPeriod, categoryId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Buscar categorias
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, emoji')
        .eq('tenant_id', tenantId);

      if (!categories) return;

      const analytics: CategoryAnalyticsData[] = [];

      for (const category of categories) {
        if (categoryId && category.id !== categoryId) continue;

        // Calcular período
        const endDate = new Date();
        let startDate = new Date();
        
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

        // Buscar transações da categoria
        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            amount, 
            date,
            banks(name)
          `)
          .eq('tenant_id', tenantId)
          .eq('category_id', category.id)
          .eq('kind', 'expense')
          .eq('status', 'settled')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (!transactions || transactions.length === 0) continue;

        // Calcular métricas
        const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
        const transactionCount = transactions.length;
        const avgTransactionValue = transactionCount > 0 ? totalSpent / transactionCount : 0;

        // Top bancos
        const bankMap = new Map<string, number>();
        transactions
          .filter(t => t.banks)
          .forEach(t => {
            const bankName = t.banks.name;
            bankMap.set(bankName, (bankMap.get(bankName) || 0) + t.amount);
          });

        const topBanks = Array.from(bankMap.entries())
          .map(([name, amount]) => ({
            bankName: name,
            amount,
            percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
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

          const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= monthStart && tDate <= monthEnd;
          });

          const monthAmount = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

          monthlyTrend.push({
            month: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
            amount: monthAmount,
            transactions: monthTransactions.length
          });
        }

        // Atividade diária (últimos 7 dias)
        const dailyActivity = [];
        for (let i = 6; i >= 0; i--) {
          const dayDate = new Date();
          dayDate.setDate(dayDate.getDate() - i);
          const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1);

          const dayTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= dayStart && tDate < dayEnd;
          });

          dailyActivity.push({
            day: dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }),
            amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0),
            transactions: dayTransactions.length
          });
        }

        // Calcular crescimento (comparação com mês anterior)
        const currentMonth = monthlyTrend[monthlyTrend.length - 1]?.amount || 0;
        const previousMonth = monthlyTrend[monthlyTrend.length - 2]?.amount || 0;
        const growthRate = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

        analytics.push({
          categoryId: category.id,
          categoryName: category.name,
          emoji: category.emoji,
          totalSpent,
          transactionCount,
          avgTransactionValue,
          monthlyTrend,
          dailyActivity,
          topBanks,
          growthRate
        });
      }

      // Ordenar por total gasto
      analytics.sort((a, b) => b.totalSpent - a.totalSpent);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('[CATEGORY_ANALYTICS] Error loading analytics:', error);
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
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-muted-foreground">
            Adicione transações para ver as análises das suas categorias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Período Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Análise de Categorias (Histórico Completo)</h3>
        <div className="flex gap-2">
          {(['30d', '90d', 'max'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {period === '30d' ? '30 dias' : period === '90d' ? '90 dias' : 'Máximo'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Categorias */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analyticsData.slice(0, 6).map((category) => (
          <Card key={category.categoryId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-lg">{category.emoji}</span>
                {category.categoryName}
              </CardTitle>
              <div className="flex items-center gap-1">
                {getTrendIcon(category.growthRate)}
                <span className={`text-xs ${getTrendColor(category.growthRate)}`}>
                  {category.growthRate > 0 ? '+' : ''}{category.growthRate.toFixed(1)}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Gasto</span>
                  <span className="text-lg font-bold">{formatCurrency(category.totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transações</span>
                  <span className="text-sm font-medium">{category.transactionCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Médio</span>
                  <span className="text-sm font-medium">{formatCurrency(category.avgTransactionValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribuição por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ categoryName, totalSpent }) => `${categoryName}: ${formatCurrency(totalSpent)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalSpent"
                >
                  {analyticsData.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendência Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendência Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData[0]?.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#3B82F6" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Atividade Diária */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Diária (Últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData[0]?.dailyActivity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resumo Detalhado por Categoria */}
      <div className="grid gap-4 md:grid-cols-2">
        {analyticsData.slice(0, 4).map((category) => (
          <Card key={category.categoryId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{category.emoji}</span>
                {category.categoryName} - Resumo Detalhado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Total Gasto</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(category.totalSpent)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-sm text-purple-600 dark:text-purple-400">Transações</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {category.transactionCount}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Médio</span>
                  <span className="text-sm font-medium">{formatCurrency(category.avgTransactionValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Crescimento</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(category.growthRate)}
                    <span className={`text-sm font-medium ${getTrendColor(category.growthRate)}`}>
                      {category.growthRate > 0 ? '+' : ''}{category.growthRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {category.topBanks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Bancos</h4>
                  <div className="space-y-1">
                    {category.topBanks.slice(0, 3).map((bank, index) => (
                      <div key={bank.bankName} className="flex justify-between items-center">
                        <span className="text-sm">{bank.bankName}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {bank.percentage.toFixed(1)}%
                          </Badge>
                          <span className="text-sm font-medium">{formatCurrency(bank.amount)}</span>
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

export default CategoryAnalytics;
