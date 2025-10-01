import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface MonthlyData {
  month: string;
  value: number; // total do mês (para cálculos internos)
  valueSolid: number | null; // realizado (ou futuro já pago)
  valueProjected: number | null; // apenas projeção (meses futuros não pagos)
  isProjected?: boolean;
}

interface SingleLineChartProps {
  title?: string;
  dataType: 'income' | 'expense';
  lineColor?: string;
  lineName?: string;
}

export const SingleLineChart = ({
  title = "Gráfico Mensal",
  dataType = 'income',
  lineColor = "hsl(var(--chart-1))",
  lineName = "Valor",
}: SingleLineChartProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth(); // 0-based (Janeiro = 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-foreground" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const loadMonthlyData = async () => {
    if (!tenantId) {
      console.log('[SINGLE_LINE_CHART] ⏳ Aguardando tenantId...');
      return;
    }
    
    console.log('[SINGLE_LINE_CHART] 🔄 Carregando dados com tenantId:', tenantId);
    
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const months = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez",
      ];

      // Query única para todos os meses
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('amount, date, status')
        .eq('kind', dataType)
        .eq('tenant_id', tenantId)
        .gte('date', `${currentYear}-01-01`)
        .lte('date', `${currentYear}-12-31`);

      if (!transactionData) {
        // Evita sobrescrever com zeros em um momento de race/reload
        setLoading(false);
        return;
      }

      // Filtrar transferências no JavaScript (pelo título) - Deploy fix
      const isTransfer = (t: any) => {
        const title = (t?.title || '').toLowerCase();
        return title.includes('transfer') || title.includes('transferência') || title.includes('transferencia');
      };

      let monthlyData: MonthlyData[] = months.map((month, index) => {
        const monthTransactions = transactionData?.filter((t) => new Date(t.date).getMonth() === index) || [];
        
        // Filtrar transferências
        const filteredTransactions = monthTransactions.filter((t: any) => !isTransfer(t));
        
        const hasSettled = filteredTransactions.some((t: any) => t.status === 'settled');
        const isFutureMonth = index > currentMonth;

        const totalAll = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const totalSettled = filteredTransactions
          .filter((t: any) => t.status === 'settled')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const value = isFutureMonth ? totalAll : totalSettled;

        // Sólido quando: mês passado/atual (sempre) OU mês futuro com algum settled
        const valueSolid = (!isFutureMonth || hasSettled) ? value : null;
        // Projetado quando: mês futuro e não há settled
        const valueProjected = (isFutureMonth && !hasSettled) ? value : null;

        return {
          month,
          value,
          valueSolid,
          valueProjected,
          isProjected: isFutureMonth && !hasSettled,
        };
      });

      // Evitar ruptura entre o último ponto sólido e o primeiro previsto
      for (let i = 0; i < monthlyData.length; i++) {
        if (monthlyData[i].isProjected && i > 0 && !monthlyData[i - 1].isProjected) {
          // adiciona o ponto anterior na série prevista para conectar
          monthlyData[i - 1].valueProjected = monthlyData[i - 1].value;
        }
      }

      setData(monthlyData);
    } catch (error) {
      console.error('Error loading monthly data:', error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const debouncedLoad = useCallback(debounce(() => {
    if (!tenantId) return;
    loadMonthlyData();
  }, 300), [tenantId, dataType]);
  
  useEffect(() => {
    if (user && tenantId) {
      console.log('[SINGLE_LINE_CHART] 🔄 useEffect triggered - Carregando dados:', { user: !!user, tenantId });
      debouncedLoad();
    } else {
      console.log('[SINGLE_LINE_CHART] ⏳ Aguardando user e tenantId:', { user: !!user, tenantId });
    }
  }, [user, tenantId, debouncedLoad]);

  // Recarregar automaticamente quando houver inserts/updates/deletes em transactions
  useRealtimeSync({
    table: 'transactions',
    debounceMs: 700,
    onInsert: () => setTimeout(() => debouncedLoad(), 200),
    onUpdate: () => setTimeout(() => debouncedLoad(), 200),
    onDelete: () => setTimeout(() => debouncedLoad(), 200),
  });

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
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-muted-foreground" fontSize={12} />
              <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              {/* Linha sólida (meses realizados e futuros já pagos) */}
              <Line
                type="linear"
                dataKey="valueSolid"
                stroke={lineColor}
                strokeWidth={3}
                fill="none"
                name={lineName}
                dot={(props: any) => (
                  <circle cx={props.cx} cy={props.cy} r={4} fill={lineColor} />
                )}
                activeDot={{ r: 4, fill: lineColor }}
                isAnimationActive={true}
                connectNulls={false}
              />
              {/* Linha projetada (somente meses futuros ainda não pagos) */}
              <Line
                type="linear"
                dataKey="valueProjected"
                stroke={lineColor}
                strokeOpacity={0.4}
                strokeDasharray="4 4"
                strokeWidth={3}
                fill="none"
                name={`${lineName} (Previsto)`}
                dot={(props: any) => (
                  <circle cx={props.cx} cy={props.cy} r={4} fill={lineColor} opacity={0.4} />
                )}
                activeDot={{ r: 4, fill: lineColor, opacity: 0.6 }}
                isAnimationActive={true}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda Customizada */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <div 
              className="w-4 h-0.5 rounded-full" 
              style={{ backgroundColor: lineColor }}
            ></div>
            <span className="text-sm font-medium text-foreground">{lineName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};