import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { supabase } from '../../integrations/supabase/client';

interface MonthlyData {
  month: string;
  receitasPagas: number;
  despesasPagas: number;
  receitasPendentes: number;
  despesasPendentes: number;
  receitasPagasFuture: number;
  despesasPagasFuture: number;
  receitasPendentesFuture: number;
  despesasPendentesFuture: number;
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
    if (!tenantId) return;
    try {
      setLoading(true);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const monthlyData: MonthlyData[] = [];
      
      // Get data for all 12 months of the current year (January to December)
      for (let month = 0; month < 12; month++) {
        const year = currentYear;
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
        const startDateStr = startOfMonth.toISOString().split('T')[0];
        const endDateStr = endOfMonth.toISOString().split('T')[0];
        
        // Fetch settled income data for this month
        const { data: incomeSettledData, error: incomeSettledError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('kind', 'income')
          .eq('status', 'settled')
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        // Fetch pending income data for this month
        const { data: incomePendingData, error: incomePendingError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('kind', 'income')
          .eq('status', 'pending')
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        // Fetch settled expense data for this month
        const { data: expenseSettledData, error: expenseSettledError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('kind', 'expense')
          .eq('status', 'settled')
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        // Fetch pending expense data for this month
        const { data: expensePendingData, error: expensePendingError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('kind', 'expense')
          .eq('status', 'pending')
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        if (incomeSettledError) {
          console.error(`Error fetching settled income data for ${year}-${month + 1}:`, incomeSettledError);
        }
        if (incomePendingError) {
          console.error(`Error fetching pending income data for ${year}-${month + 1}:`, incomePendingError);
        }
        if (expenseSettledError) {
          console.error(`Error fetching settled expense data for ${year}-${month + 1}:`, expenseSettledError);
        }
        if (expensePendingError) {
          console.error(`Error fetching pending expense data for ${year}-${month + 1}:`, expensePendingError);
        }

        const receitasSettled = incomeSettledData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const receitasPending = incomePendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const despesasSettled = expenseSettledData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const despesasPending = expensePendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

        const monthNames = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];

        // Determine if this is a future month
        const isFuture = month > currentMonth;

        monthlyData.push({
          month: monthNames[month],
          receitasPagas: isFuture ? 0 : receitasSettled,
          despesasPagas: isFuture ? 0 : despesasSettled,
          receitasPendentes: isFuture ? 0 : receitasPending,
          despesasPendentes: isFuture ? 0 : despesasPending,
          receitasPagasFuture: isFuture ? receitasSettled : 0,
          despesasPagasFuture: isFuture ? despesasSettled : 0,
          receitasPendentesFuture: isFuture ? receitasPending : 0,
          despesasPendentesFuture: isFuture ? despesasPending : 0,
          isFuture
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
      currency: 'BRL'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filtrar apenas entradas com valor maior que 0
      const filteredPayload = payload.filter((entry: any) => entry.value > 0);
      
      // Se não há entradas com valor, não mostrar tooltip
      if (filteredPayload.length === 0) {
        return null;
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {filteredPayload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
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
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
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
        <div className="h-80 sm:h-80 h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={80} barCategoryGap="2%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                payload={[
                  { value: 'Receitas Pagas', type: 'rect', color: '#10b981' },
                  { value: 'Despesas Pagas', type: 'rect', color: '#ef4444' },
                  { value: 'Receitas Pendentes', type: 'rect', color: '#86efac' },
                  { value: 'Despesas Pendentes', type: 'rect', color: '#fca5a5' }
                ]}
              />
              {/* 1. Receitas Pagas (meses passados/atuais) */}
              <Bar 
                dataKey="receitasPagas" 
                fill="#10b981" 
                name="Receitas Pagas"
                radius={[4, 4, 0, 0]}
                stackId="receitas"
              />
              {/* 2. Despesas Pagas (meses passados/atuais) */}
              <Bar 
                dataKey="despesasPagas" 
                fill="#ef4444" 
                name="Despesas Pagas"
                radius={[4, 4, 0, 0]}
                stackId="despesas"
              />
              {/* 3. Receitas Pendentes (meses passados/atuais) */}
              <Bar 
                dataKey="receitasPendentes" 
                fill="#86efac" 
                name="Receitas Pendentes"
                radius={[4, 4, 0, 0]}
                stackId="receitas"
              />
              {/* 4. Despesas Pendentes (meses passados/atuais) */}
              <Bar 
                dataKey="despesasPendentes" 
                fill="#fca5a5" 
                name="Despesas Pendentes"
                radius={[4, 4, 0, 0]}
                stackId="despesas"
              />
              {/* Barras futuras com transparência (sem nome para não duplicar legenda) */}
              <Bar 
                dataKey="receitasPagasFuture" 
                fill="rgba(16, 185, 129, 0.6)" 
                name=""
                radius={[4, 4, 0, 0]}
                stackId="receitas"
              />
              <Bar 
                dataKey="despesasPagasFuture" 
                fill="rgba(239, 68, 68, 0.6)" 
                name=""
                radius={[4, 4, 0, 0]}
                stackId="despesas"
              />
              <Bar 
                dataKey="receitasPendentesFuture" 
                fill="rgba(134, 239, 172, 0.6)" 
                name=""
                radius={[4, 4, 0, 0]}
                stackId="receitas"
              />
              <Bar 
                dataKey="despesasPendentesFuture" 
                fill="rgba(252, 165, 165, 0.6)" 
                name=""
                radius={[4, 4, 0, 0]}
                stackId="despesas"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};