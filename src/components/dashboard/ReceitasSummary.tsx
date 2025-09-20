import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, CheckCircle, ClockIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useTenant } from "@/hooks/useTenant";

interface ReceitasSummaryProps {
  refreshKey?: number;
  dateFilter?: { from: Date | undefined; to: Date | undefined } | null;
  onDataChange?: (data: { totalReceitas: number; receitasRecebidas: number; receitasPrevistas: number; }) => void;
}

export const ReceitasSummary = ({ refreshKey, dateFilter, onDataChange }: ReceitasSummaryProps) => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalReceitas: 0,
    receitasRecebidas: 0,
    receitasPrevistas: 0,
  });

  useEffect(() => {
    if (user && tenantId) {
      loadSummary();
    }
  }, [user, tenantId, refreshKey, dateFilter]);

  const loadSummary = async () => {
    if (!tenantId) return;
    
    try {
      // Se há filtro de data personalizado, usar ele. Caso contrário, usar mês atual
      let startDate: string;
      let endDate: string;
      
      if (dateFilter && dateFilter.from && dateFilter.to) {
        startDate = dateFilter.from.toISOString().split('T')[0];
        endDate = dateFilter.to.toISOString().split('T')[0];
      } else {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name
          )
        `)
        .eq('kind', 'income')
        .eq('tenant_id', tenantId)
        .not('categories.name', 'eq', 'Transferência entre Bancos') // Excluir transferências
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const total = data.reduce((acc, transaction) => acc + transaction.amount, 0);
      const recebidas = data
        .filter(t => t.status === 'settled')
        .reduce((acc, transaction) => acc + transaction.amount, 0);
      const previstas = data
        .filter(t => t.status === 'pending')
        .reduce((acc, transaction) => acc + transaction.amount, 0);

      const summaryData = {
        totalReceitas: total,
        receitasRecebidas: recebidas,
        receitasPrevistas: previstas,
      };

      setSummary(summaryData);
      onDataChange?.(summaryData);
    } catch (error) {
      console.error('[RECEITAS SUMMARY] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodTitle = (baseTitle: string) => {
    if (dateFilter && dateFilter.from && dateFilter.to) {
      return baseTitle.replace("do Mês", "do Período");
    }
    return baseTitle;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {getPeriodTitle("Total de Receitas do Mês")}
          </CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalReceitas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Receitas Recebidas
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.receitasRecebidas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Receitas Previstas
          </CardTitle>
          <ClockIcon className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(summary.receitasPrevistas)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};