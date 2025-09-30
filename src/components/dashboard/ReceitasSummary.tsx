import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, CheckCircle, ClockIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { getReceitasLabels } from "@/utils/dateFilterLabels";

interface ReceitasSummaryProps {
  refreshKey?: number;
  dateFilter?: { from: Date | undefined; to: Date | undefined } | null;
  onDataChange?: (data: { totalReceitas: number; receitasRecebidas: number; receitasPrevistas: number; }) => void;
  // Novos props para receber dados já carregados
  receitas?: any[];
  loading?: boolean;
}

export const ReceitasSummary = ({ refreshKey, dateFilter, onDataChange, receitas, loading: externalLoading }: ReceitasSummaryProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [internalLoading, setInternalLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalReceitas: 0,
    receitasRecebidas: 0,
    receitasPrevistas: 0,
  });

  // Usar loading externo se disponível, senão usar interno
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    console.log('[RECEITAS SUMMARY] 🔄 RESTAURADO - useEffect triggered:', { 
      refreshKey, 
      dateFilter,
      hasReceitasData: !!receitas,
      receitasLength: receitas?.length || 0,
      hasUser: !!user,
      hasTenantId: !!tenantId,
      timestamp: new Date().toISOString(),
      version: '3.0.0-RESTORED'
    });
    
    // Se há dados externos, usar eles
    if (receitas !== undefined && Array.isArray(receitas)) {
      console.log('[RECEITAS SUMMARY] ✅ DADOS EXTERNOS - Usando dados passados como props:', receitas.length);
      calculateSummaryFromData(receitas);
      return;
    }
    
    // Se não há dados externos, fazer consulta própria
    if (user && tenantId) {
      console.log('[RECEITAS SUMMARY] 🔄 FAZENDO CONSULTA PRÓPRIA - Carregando dados do Supabase');
      loadSummary();
    } else {
      console.log('[RECEITAS SUMMARY] ⏳ AGUARDANDO - User ou TenantId não disponível');
      setSummary({
        totalReceitas: 0,
        receitasRecebidas: 0,
        receitasPrevistas: 0,
      });
      setInternalLoading(false);
    }
  }, [refreshKey, dateFilter, receitas, user, tenantId]);

  // Função para calcular resumo a partir de dados já carregados
  const calculateSummaryFromData = (data: any[]) => {
    console.log('[RECEITAS SUMMARY] 🧮 Calculando resumo a partir de dados:', {
      dataLength: data.length,
      sampleData: data.slice(0, 3).map(t => ({ title: t.title, amount: t.amount, status: t.status }))
    });
    
    // Filtrar transferências apenas no código, preservando receitas sem categoria
    const filtered = data.filter(t => {
      // Filtrar por título (transferências)
      const isTransfer = t.title?.toLowerCase().includes('transferência') || 
                        t.title?.toLowerCase().includes('transfer');
      
      // Filtrar por categoria (se existir)
      const isTransferCategory = t.categories?.name === 'Transferência entre Bancos';
      
      return !isTransfer && !isTransferCategory;
    });
    
    console.log('[RECEITAS SUMMARY] 🔍 Dados filtrados:', { 
      total: data.length, 
      filtered: filtered.length,
      filteredSample: filtered.slice(0, 3).map(t => ({ title: t.title, amount: t.amount, status: t.status }))
    });

    const total = filtered.reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
    const recebidas = filtered
      .filter(t => t.status === 'settled')
      .reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
    const previstas = filtered
      .filter(t => t.status === 'pending')
      .reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
    
    console.log('[RECEITAS SUMMARY] 📊 Cálculos a partir de dados:', { 
      total, 
      recebidas, 
      previstas,
      settledCount: filtered.filter(t => t.status === 'settled').length,
      pendingCount: filtered.filter(t => t.status === 'pending').length
    });

    const summaryData = {
      totalReceitas: total,
      receitasRecebidas: recebidas,
      receitasPrevistas: previstas,
    };

    console.log('[RECEITAS SUMMARY] ✅ Definindo resumo:', summaryData);
    setSummary(summaryData);
    onDataChange?.(summaryData);
    setInternalLoading(false);
  };

  // Função para carregar dados do Supabase
  const loadSummary = async () => {
    if (!user || !tenantId) return;
    
    console.log('[RECEITAS SUMMARY] 🔄 FAZENDO CONSULTA PRÓPRIA - Carregando dados do Supabase:', { user: !!user, tenantId });
    
    setInternalLoading(true);
    
    try {
      // Aplicar filtro de data se fornecido
      // Consulta minimalista, sem JOINs para evitar PGRST201
      let query = supabase
        .from('transactions')
        .select(`
          amount,
          status,
          title,
          date
        `)
        .eq('kind', 'income')
        .eq('tenant_id', tenantId);

      // Aplicar filtro de data se fornecido
      if (dateFilter && dateFilter.from && dateFilter.to) {
        const startDate = dateFilter.from.toISOString().split('T')[0];
        const endDate = dateFilter.to.toISOString().split('T')[0];
        query = query.gte('date', startDate).lte('date', endDate);
        console.log('[RECEITAS SUMMARY] 📅 Aplicando filtro de data:', { startDate, endDate });
      } else {
        // Se não há filtro de data, usar mês atual
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        query = query.gte('date', startDate).lte('date', endDate);
        console.log('[RECEITAS SUMMARY] 📅 Usando mês atual:', { startDate, endDate });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('[RECEITAS SUMMARY] 📊 Dados carregados do Supabase:', {
        totalRecords: data?.length || 0,
        sampleData: data?.slice(0, 3).map(t => ({ amount: t.amount, status: t.status })),
        timestamp: new Date().toISOString()
      });
      
      // Filtrar transferências entre bancos (sem depender de JOIN de categorias)
      const filtered = (data || []).filter((row: any) => {
        const title = (row?.title || '').toLowerCase();
        const isTransferTitle = title.includes('transfer') || title.includes('transferência') || title.includes('transferencia');
        return !isTransferTitle;
      });
      
      console.log('[RECEITAS SUMMARY] 🔍 Dados filtrados:', {
        originalCount: data?.length || 0,
        filteredCount: filtered.length,
        timestamp: new Date().toISOString()
      });
      
      // Calcular resumo
      const total = filtered.reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
      const recebidas = filtered
        .filter(t => t.status === 'settled')
        .reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
      const previstas = filtered
        .filter(t => t.status === 'pending')
        .reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
      
      console.log('[RECEITAS SUMMARY] 📊 Cálculos realizados:', { 
        total, 
        recebidas, 
        previstas,
        settledCount: filtered.filter(t => t.status === 'settled').length,
        pendingCount: filtered.filter(t => t.status === 'pending').length
      });

      const summaryData = {
        totalReceitas: total,
        receitasRecebidas: recebidas,
        receitasPrevistas: previstas,
      };

      console.log('[RECEITAS SUMMARY] ✅ Definindo resumo:', summaryData);
      setSummary(summaryData);
      onDataChange?.(summaryData);
    } catch (error) {
      console.error('[RECEITAS SUMMARY] ❌ Error loading:', error);
    } finally {
      setInternalLoading(false);
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <div className="h-4 w-20 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent className="pt-1 sm:pt-0">
              <div className="h-8 w-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Gerar labels dinâmicos baseados no filtro de período
  const labels = getReceitasLabels(dateFilter);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {labels.total}
          </CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalReceitas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {labels.recebidas}
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.receitasRecebidas)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {labels.previstas}
          </CardTitle>
          <ClockIcon className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(summary.receitasPrevistas)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};