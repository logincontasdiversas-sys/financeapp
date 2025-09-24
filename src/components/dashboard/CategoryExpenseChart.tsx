import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LabelList } from "recharts";
import { PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface CategoryData {
  id: string;
  name: string;
  emoji: string;
  value: number;
  color: string;
  percentage?: number;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CategoryExpenseChartProps {
  dateFilter?: DateRange | null;
}

// Paleta igual à do gráfico do Dashboard
const COLORS = [
  '#4472C4', '#0F4761', '#E15759', '#C5504B', '#70AD47', '#F79646',
  '#9966CC', '#4BACC6', '#8C8C8C'
];

export const CategoryExpenseChart = ({ dateFilter }: CategoryExpenseChartProps) => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [percentOfRevenue, setPercentOfRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Check if we're looking at a future period
  const today = new Date();
  const isFuturePeriod = dateFilter && dateFilter.to && 
    (dateFilter.to.getFullYear() > today.getFullYear() || 
     (dateFilter.to.getFullYear() === today.getFullYear() && 
      dateFilter.to.getMonth() > today.getMonth()));

  useEffect(() => {
    if (user && tenantId) {
      loadCategoryData();
    }
  }, [user, tenantId, dateFilter]);

  useRealtimeSync({
    table: 'transactions',
    debounceMs: 700,
    onInsert: () => setTimeout(() => loadCategoryData(), 200),
    onUpdate: () => setTimeout(() => loadCategoryData(), 200),
    onDelete: () => setTimeout(() => loadCategoryData(), 200),
  });

  const toDateStr = (d: Date) => {
    const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return localDate.toISOString().split('T')[0];
  };

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
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
        .eq('tenant_id', tenantId)
        .not('categories', 'is', null);

      // Include pending transactions for future periods
      if (isFuturePeriod) {
        // For future periods, include both settled and pending
        query = query.in('status', ['settled', 'pending']);
      } else {
        // For past/current periods, only settled
        query = query.eq('status', 'settled');
      }

      // Apply date filter if provided
      if (dateFilter && dateFilter.from && dateFilter.to) {
        const startDate = toDateStr(dateFilter.from);
        const endDate = toDateStr(dateFilter.to);
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (dateFilter !== null) {
        // Default to current month if no specific filter
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];
        query = query.gte('date', startDate).lte('date', endDate);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      // Buscar total de receitas para ser a base da porcentagem (excluindo transferências entre bancos)
      // 1) Todas as receitas (sem join) para evitar filtros que descartem nulos
      let incomeAllQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('kind', 'income');
      if (isFuturePeriod) incomeAllQuery = incomeAllQuery.in('status', ['settled', 'pending']);
      else incomeAllQuery = incomeAllQuery.eq('status', 'settled');
      if (dateFilter && dateFilter.from && dateFilter.to) {
        const startDate = toDateStr(dateFilter.from);
        const endDate = toDateStr(dateFilter.to);
        incomeAllQuery = incomeAllQuery.gte('date', startDate).lte('date', endDate);
      } else if (dateFilter !== null) {
        const startOfMonth = new Date(); startOfMonth.setDate(1);
        const endOfMonth = new Date(); endOfMonth.setMonth(endOfMonth.getMonth() + 1); endOfMonth.setDate(0);
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];
        incomeAllQuery = incomeAllQuery.gte('date', startDate).lte('date', endDate);
      }
      const { data: incomeAll, error: incomeAllErr } = await incomeAllQuery;
      if (incomeAllErr) throw incomeAllErr;

      // 2) Receitas apenas da categoria "Transferência entre Bancos" para subtrair
      let transferIncomeQuery = supabase
        .from('transactions')
        .select('amount, categories(name)')
        .eq('tenant_id', tenantId)
        .eq('kind', 'income')
        .eq('categories.name', 'Transferência entre Bancos');
      if (isFuturePeriod) transferIncomeQuery = transferIncomeQuery.in('status', ['settled', 'pending']);
      else transferIncomeQuery = transferIncomeQuery.eq('status', 'settled');
      if (dateFilter && dateFilter.from && dateFilter.to) {
        const startDate = toDateStr(dateFilter.from);
        const endDate = toDateStr(dateFilter.to);
        transferIncomeQuery = transferIncomeQuery.gte('date', startDate).lte('date', endDate);
      } else if (dateFilter !== null) {
        const startOfMonth = new Date(); startOfMonth.setDate(1);
        const endOfMonth = new Date(); endOfMonth.setMonth(endOfMonth.getMonth() + 1); endOfMonth.setDate(0);
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];
        transferIncomeQuery = transferIncomeQuery.gte('date', startDate).lte('date', endDate);
      }
      const { data: transferIncome, error: transferErr } = await transferIncomeQuery;
      if (transferErr) throw transferErr;

      const sumAllIncome = (incomeAll || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
      const sumTransferIncome = (transferIncome || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
      const totalIncome = Math.max(0, sumAllIncome - sumTransferIncome);

      // Group by category
      const categoryMap = new Map<string, { name: string; emoji: string; total: number }>();
      
      data?.forEach((transaction) => {
        if (transaction.categories) {
          const category = transaction.categories;
          const existing = categoryMap.get(category.id);
          
          if (existing) {
            existing.total += Number(transaction.amount);
          } else {
            categoryMap.set(category.id, {
              name: category.name,
              emoji: category.emoji,
              total: Number(transaction.amount)
            });
          }
        }
      });

      // Convert to array and add unique colors
      const categoryArray = Array.from(categoryMap.entries()).map(([id, data], index) => ({
        id,
        name: data.name,
        emoji: data.emoji,
        value: data.total,
        color: COLORS[index] // Use direct index to ensure unique colors
      }));

      // Sort by value descending
      categoryArray.sort((a, b) => b.value - a.value);

      // Percentuais: preferencialmente sobre RECEITA; fallback sobre total das DESPESAS
      const expenseTotal = categoryArray.reduce((sum, i) => sum + i.value, 0);
      const base = totalIncome > 0 ? totalIncome : expenseTotal;
      const categoryWithPercentage = categoryArray.map(item => ({
        ...item,
        percentage: base > 0 ? (item.value / base) * 100 : 0
      }));

      setCategoryData(categoryWithPercentage);

      // Meta: quanto as despesas representam da receita (0 se receita 0)
      setPercentOfRevenue(totalIncome > 0 ? (expenseTotal / totalIncome) * 100 : 0);
    } catch (error) {
      console.error('Error loading category data:', error);
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

  // Custom label component with external labels and connecting lines
  const CustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage, name } = props;
    
    if (percentage < 1) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20; // Position labels outside the donut
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Calculate line end points
    const lineX = cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN);
    const lineY = cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        {/* Connecting line */}
        <line
          x1={cx + outerRadius * Math.cos(-midAngle * RADIAN)}
          y1={cy + outerRadius * Math.sin(-midAngle * RADIAN)}
          x2={lineX}
          y2={lineY}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground"
        />
        {/* Label */}
        <text 
          x={x} 
          y={y} 
          fill="currentColor" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          fontSize="11"
          fontWeight="500"
          className="text-foreground"
        >
          {percentage > 1 ? `${percentage.toFixed(0)}%` : `${percentage.toFixed(1)}%`}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <span>{data.emoji}</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="text-sm">
            <div>Valor: {formatCurrency(data.value)}</div>
            <div>Porcentagem: {data.percentage?.toFixed(1)}%</div>
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
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuição de Gastos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          {isFuturePeriod ? "Distribuição Prevista de Gastos por Categoria" : "Distribuição de Gastos por Categoria"}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {`Porcentagem dos gastos em relação às receitas do período (${percentOfRevenue.toFixed(1)}% das receitas)`}
        </div>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum gasto registrado no período
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ResponsiveContainer width="100%" height={500}>
                <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomLabel}
                    outerRadius={140}
                    innerRadius={0}
                    fill="hsl(var(--muted))"
                    dataKey="value"
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
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span>{category.emoji}</span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-destructive">{formatCurrency(category.value)}</div>
                    <div className="text-xs text-muted-foreground">{category.percentage?.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};