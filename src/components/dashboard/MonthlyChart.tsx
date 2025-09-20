import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  isFuture?: boolean;
}

interface MonthlyChartProps {
  title?: string;
}

export const MonthlyChart = ({ title = "Receitas e Despesas Mensais" }: MonthlyChartProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && tenantId) {
      loadMonthlyData();
    }
  }, [user, tenantId]);

  useRealtimeSync({
    table: 'transactions',
    debounceMs: 700,
    onInsert: () => setTimeout(() => loadMonthlyData(), 200),
    onUpdate: () => setTimeout(() => loadMonthlyData(), 200),
    onDelete: () => setTimeout(() => loadMonthlyData(), 200),
  });

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-based (Janeiro = 0)
      const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      
      const monthlyData: MonthlyData[] = [];

      for (let month = 0; month < 12; month++) {
        const startDate = new Date(currentYear, month, 1);
        const endDate = new Date(currentYear, month + 1, 0);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Determinar se é um mês futuro para aplicar transparência
        const isFutureMonth = month > currentMonth;

        // Fetch income transactions (inclui status para aplicar regra de futuro)
        const { data: incomeData } = await supabase
          .from('transactions')
          .select(`
            amount, 
            status,
            categories(name)
          `)
          .eq('kind', 'income')
          .eq('tenant_id', tenantId)
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        // Fetch expense transactions  
        const { data: expenseData } = await supabase
          .from('transactions')
          .select(`
            amount, 
            status,
            categories(name)
          `)
          .eq('kind', 'expense')
          .eq('tenant_id', tenantId)
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        // Filtrar transferências no JavaScript
        const filteredIncomeData = (incomeData || []).filter(transaction => 
          transaction.categories?.name !== 'Transferência entre Bancos'
        );
        const filteredExpenseData = (expenseData || []).filter(transaction => 
          transaction.categories?.name !== 'Transferência entre Bancos'
        );

        // Regra: mês passado/atual -> soma apenas 'settled'; mês futuro -> soma todos (previsão)
        // Se houver qualquer registro 'settled' no mês futuro, tratar como realizado
        const hasSettledIncome = filteredIncomeData.some((t: any) => t.status === 'settled');
        const hasSettledExpense = filteredExpenseData.some((t: any) => t.status === 'settled');

        const receitas = filteredIncomeData
          .filter((t: any) => (!isFutureMonth || hasSettledIncome ? t.status === 'settled' : true))
          .reduce((sum, item) => sum + Number(item.amount), 0);
        const despesas = filteredExpenseData
          .filter((t: any) => (!isFutureMonth || hasSettledExpense ? t.status === 'settled' : true))
          .reduce((sum, item) => sum + Number(item.amount), 0);

        // Debug para o mês atual
        if (month === currentMonth) {
          console.log(`[MONTHLY_CHART_DEBUG] Current month (${months[month]}):`, {
            allIncomeData: incomeData?.length || 0,
            filteredIncomeData: filteredIncomeData.length,
            allExpenseData: expenseData?.length || 0,
            filteredExpenseData: filteredExpenseData.length,
            receitas,
            despesas
          });
        }

        monthlyData.push({
          month: months[month],
          receitas,
          despesas,
          isFuture: isFutureMonth
        });
      }

      setData(monthlyData);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value).replace('R$', 'R$')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="receitas" 
                fill="hsl(var(--success))" 
                name="Receitas"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-receitas-${index}`} fillOpacity={entry.isFuture ? 0.3 : 0.8} />
                ))}
              </Bar>
              <Bar 
                dataKey="despesas" 
                fill="hsl(var(--destructive))" 
                name="Despesas"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-despesas-${index}`} fillOpacity={entry.isFuture ? 0.3 : 0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda Customizada */}
        <div className="mt-4 flex justify-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: 'hsl(var(--success))' }}
            ></div>
            <span className="text-sm font-medium text-foreground">Receitas</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: 'hsl(var(--destructive))' }}
            ></div>
            <span className="text-sm font-medium text-foreground">Despesas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};