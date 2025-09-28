import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTenant } from "@/hooks/useTenant";

interface CategoryData {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  percentage: number;
  color: string;
}

const COLORS = [
  '#4472C4', // Azul 
  '#0F4761', // Azul escuro
  '#E15759', // Rosa/Magenta claro
  '#C5504B', // Rosa/Magenta escuro
  '#70AD47', // Verde
  '#F79646', // Laranja
  '#9966CC', // Roxo
  '#4BACC6', // Azul claro
  '#8C8C8C'  // Cinza
];

export const CategoryPieChart = () => {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  // Atualização automática quando transactions mudarem
  useRealtimeSync({
    table: 'transactions',
    debounceMs: 700,
    onInsert: () => setTimeout(() => loadData(), 200),
    onUpdate: () => setTimeout(() => loadData(), 200),
    onDelete: () => setTimeout(() => loadData(), 200),
  });

  const loadData = async () => {
    if (!tenantId) return;
    console.log('[PIE_CHART] Iniciando carregamento de dados...');
    try {
      // Get current month dates
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startDate = startOfMonth.toISOString().split('T')[0];
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];

      // Total de receitas do mês (sem join, para não perder receitas sem categoria)
      let incomeAllQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('kind', 'income')
        .eq('status', 'settled')
        .gte('date', startDate)
        .lte('date', endDate);
      const { data: incomeAll } = await incomeAllQuery;

      // Receitas da categoria "Transferência entre Bancos" (para subtrair)
      let incomeTransferQuery = supabase
        .from('transactions')
        .select('amount, categories(name)')
        .eq('tenant_id', tenantId)
        .eq('kind', 'income')
        .eq('status', 'settled')
        .eq('categories.name', 'Transferência entre Bancos')
        .gte('date', startDate)
        .lte('date', endDate);
      const { data: incomeTransfers } = await incomeTransferQuery;

      const sumIncomeAll = (incomeAll || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const sumIncomeTransfers = (incomeTransfers || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      let monthlyIncome = Math.max(0, sumIncomeAll - sumIncomeTransfers);

      // Fallback: se ainda zerado, tenta via join (alguns datasets têm tudo categorizado)
      if (monthlyIncome === 0) {
        const { data: incomeJoin } = await supabase
          .from('transactions')
          .select('amount, categories(name)')
          .eq('tenant_id', tenantId)
          .eq('kind', 'income')
          .eq('status', 'settled')
          .not('categories.name', 'eq', 'Transferência entre Bancos')
          .gte('date', startDate)
          .lte('date', endDate);
        monthlyIncome = (incomeJoin || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      }
      setTotalIncome(monthlyIncome);

      // Buscar despesas, dívidas e categorias para mapear subcategoria (special_category_id) -> categoria-pai
      const [expenseResp, debtsResp, categoriesResp] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            amount,
            categories (
              id,
              name,
              emoji
            )
          `)
          .eq('kind', 'expense')
          .eq('status', 'settled')
          .eq('tenant_id', tenantId)
          .not('categories.name', 'eq', 'Transferência entre Bancos')
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('debts')
          .select('id, category_id, special_category_id')
          .eq('tenant_id', tenantId),
        supabase
          .from('categories')
          .select('id, name, emoji')
          .eq('tenant_id', tenantId)
      ]);

      const expenseData = expenseResp.data || [];
      const debts = debtsResp.data || [];
      const categoriesList = categoriesResp.data || [];

      // Mapa de subcategoria (special) -> categoria-pai
      const specialToParent = new Map<string, string>();
      debts.forEach((d: any) => {
        if (d.special_category_id && d.category_id) {
          specialToParent.set(d.special_category_id, d.category_id);
        }
      });

      // Mapa de categorias para obter nome/emoji da categoria-pai
      const categoriesById = new Map<string, { id: string; name: string; emoji: string }>();
      categoriesList.forEach((c: any) => {
        categoriesById.set(c.id, { id: c.id, name: c.name, emoji: c.emoji });
      });

      console.log('[PIE_CHART] Dados de despesas carregados:', expenseData?.length, 'transações');

      // Group by category
      const categoryMap = new Map<string, { name: string; emoji: string; amount: number }>();

      expenseData?.forEach((transaction: any) => {
        const cat = transaction.categories;
        if (!cat) return;

        // Filtrar categorias de fatura de cartão
        const isCreditCardCategory = (cat.name?.toLowerCase() || '').includes('- fatura');
        if (isCreditCardCategory) return;

        // Se for uma subcategoria de dívida (special), consolidar na categoria-pai
        const effectiveCategoryId = specialToParent.get(cat.id) || cat.id;
        const effectiveCategory = categoriesById.get(effectiveCategoryId) || { id: effectiveCategoryId, name: cat.name, emoji: cat.emoji || '📁' };

        const existing = categoryMap.get(effectiveCategoryId);
        if (existing) {
          existing.amount += Number(transaction.amount);
        } else {
          categoryMap.set(effectiveCategoryId, {
            name: effectiveCategory.name,
            emoji: effectiveCategory.emoji || '📁',
            amount: Number(transaction.amount)
          });
        }
      });

      console.log('[PIE_CHART] Categorias processadas:', categoryMap.size);
      console.log('[PIE_CHART] Mapa de categorias:', Array.from(categoryMap.entries()));

      const totalExpenseAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
      setTotalExpenses(totalExpenseAmount);

      // Convert to chart data with percentages relative to income
      const chartData: CategoryData[] = Array.from(categoryMap.entries()).map(([id, category], index) => ({
        id,
        name: category.name,
        emoji: category.emoji,
        amount: category.amount,
        percentage: monthlyIncome > 0 ? (category.amount / monthlyIncome) * 100 : 0,
        color: COLORS[index % COLORS.length]
      })).sort((a, b) => b.amount - a.amount);

      console.log('[PIE_CHART] Dados finais do gráfico:', chartData);
      setCategoryData(chartData);
    } catch (error) {
      console.error('[PIE_CHART] Error loading data:', error);
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <span>{data.emoji}</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="text-sm">
            <div>Valor: {formatCurrency(data.amount)}</div>
            <div className="text-muted-foreground">{`${data.percentage.toFixed(1)}% da receita`}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-6 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Distribuição de Gastos por Categoria
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Porcentagem dos gastos em relação às receitas do mês ({expensePercentage.toFixed(1)}% das receitas)
        </div>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum gasto registrado neste mês
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ResponsiveContainer width="100%" height={400}>
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={({ percentage }) => `${percentage.toFixed(0)}%`}
                     outerRadius={140}
                     innerRadius={0}
                     fill="hsl(var(--muted))"
                     dataKey="amount"
                     stroke="hsl(var(--border))"
                     strokeWidth={2}
                   >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium mb-3">Legenda</h4>
              {categoryData.map((category) => (
                <div key={category.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span>{category.emoji}</span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-destructive">
                      {formatCurrency(category.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total de Gastos:</span>
                  <span className="text-destructive">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Receitas do Mês:</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Sobra:</span>
                  <span className={totalIncome - totalExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                    {formatCurrency(totalIncome - totalExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};