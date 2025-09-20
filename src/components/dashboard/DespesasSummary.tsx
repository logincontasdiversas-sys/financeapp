import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, CheckCircle, ClockIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useTenant } from "@/hooks/useTenant";
import { dateInputToISO } from "@/utils/dateUtils";

interface DespesasSummaryProps {
  refreshKey?: number;
  dateFilter?: { from: Date | undefined; to: Date | undefined } | null;
  onDataChange?: (data: { totalDespesas: number; despesasPagas: number; despesasPendentes: number; }) => void;
}

const DespesasSummary = ({ refreshKey, dateFilter, onDataChange }: DespesasSummaryProps) => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalDespesas: 0,
    despesasPagas: 0,
    despesasPendentes: 0,
  });

  useEffect(() => {
    if (user && tenantId) {
      loadSummary();
    }
  }, [user, tenantId, refreshKey, dateFilter]);

  const toDateStr = (d: Date) => {
    // Criar uma nova data local para evitar problemas de timezone
    const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadSummary = async () => {
    if (!tenantId) return;
    
    console.log('=== DESPESAS SUMMARY DEBUG ===');
    console.log('TenantId:', tenantId);
    
    try {
      // Se há filtro de data personalizado, usar ele. Caso contrário, usar mês atual
      let startDate: string;
      let endDate: string;
      
      if (dateFilter && dateFilter.from && dateFilter.to) {
        startDate = toDateStr(dateFilter.from);
        endDate = toDateStr(dateFilter.to);
      } else {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
        startDate = toDateStr(start);
        endDate = toDateStr(end);
      }

      console.log('[DESPESAS SUMMARY] Filtro de data aplicado:', JSON.stringify({ 
        startDate, 
        endDate, 
        hasDateFilter: !!(dateFilter && dateFilter.from && dateFilter.to),
        dateFilter: dateFilter ? {
          from: dateFilter.from?.toISOString(),
          to: dateFilter.to?.toISOString()
        } : null
      }, null, 2));

      // Primeiro, vamos verificar todas as despesas existentes sem filtro de data
      const { data: allExpenses } = await supabase
        .from('transactions')
        .select('date, amount, status, payment_method')
        .eq('kind', 'expense')
        .eq('tenant_id', tenantId)
        // REMOVENDO o filtro de payment_method para ver TODAS as despesas
        .order('date', { ascending: false });

      console.log('[DESPESAS SUMMARY] Todas as despesas (sem filtro):', JSON.stringify({
        totalExpenses: allExpenses?.length || 0,
        dates: allExpenses?.map(t => t.date).slice(0, 10) || [], // primeiras 10 datas
        firstExpense: allExpenses?.[0],
        lastExpense: allExpenses?.[allExpenses?.length - 1]
      }, null, 2));

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, status, payment_method, date')
        .eq('kind', 'expense')
        .eq('tenant_id', tenantId)
        .neq('payment_method', 'credit_card')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      console.log('[DESPESAS SUMMARY] Dados retornados da query:', JSON.stringify({ 
        totalTransactions: data?.length || 0,
        firstTransaction: data?.[0],
        query: { startDate, endDate, tenantId }
      }, null, 2));

      const total = data.reduce((acc, t) => acc + Number(t.amount), 0);
      const pagas = data.filter(t => t.status === 'settled').reduce((acc, t) => acc + Number(t.amount), 0);
      const pendentes = data.filter(t => t.status === 'pending').reduce((acc, t) => acc + Number(t.amount), 0);

      console.log('[DESPESAS SUMMARY] Cálculos realizados:', JSON.stringify({ 
        total, 
        pagas, 
        pendentes,
        settledCount: data.filter(t => t.status === 'settled').length,
        pendingCount: data.filter(t => t.status === 'pending').length
      }, null, 2));

      const summaryData = {
        totalDespesas: total,
        despesasPagas: pagas,
        despesasPendentes: pendentes,
      };

      setSummary(summaryData);
      onDataChange?.(summaryData);
    } catch (error) {
      console.error('[DESPESAS SUMMARY] Error loading:', error);
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
      <div className="grid gap-4 md:grid-cols-3">
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
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {getPeriodTitle("Total de Despesas do Mês")}
          </CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalDespesas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Despesas Pagas
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.despesasPagas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Despesas Pendentes
          </CardTitle>
          <ClockIcon className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(summary.despesasPendentes)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DespesasSummary;