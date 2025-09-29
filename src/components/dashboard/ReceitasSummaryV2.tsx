import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, CheckCircle, ClockIcon } from "lucide-react";

interface ReceitasSummaryV2Props {
  refreshKey?: number;
  dateFilter?: { from: Date | undefined; to: Date | undefined } | null;
  onDataChange?: (data: { totalReceitas: number; receitasRecebidas: number; receitasPrevistas: number; }) => void;
  receitas?: any[];
  loading?: boolean;
}

export const ReceitasSummaryV2 = ({ refreshKey, dateFilter, onDataChange, receitas, loading: externalLoading }: ReceitasSummaryV2Props) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalReceitas: 0,
    receitasRecebidas: 0,
    receitasPrevistas: 0,
  });

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    console.log('[RECEITAS SUMMARY V2] 🔍 COMPONENTE COMPLETAMENTE NOVO - useEffect triggered:', { 
      refreshKey, 
      dateFilter,
      hasReceitasData: !!receitas,
      receitasLength: receitas?.length || 0,
      receitasType: typeof receitas,
      receitasIsArray: Array.isArray(receitas),
      timestamp: new Date().toISOString(),
      version: '3.0.0-COMPLETELY-NEW'
    });
    
    // COMPONENTE COMPLETAMENTE NOVO: SEMPRE usar dados passados como props - NUNCA fazer consulta
    if (receitas !== undefined && Array.isArray(receitas)) {
      console.log('[RECEITAS SUMMARY V2] ✅ DADOS EXTERNOS - Usando dados passados como props:', receitas.length);
      calculateSummaryFromData(receitas);
      return;
    }
    
    // Se não há dados externos, mostrar valores zerados (COMPONENTE COMPLETAMENTE NOVO)
    console.log('[RECEITAS SUMMARY V2] ⏳ SEM DADOS EXTERNOS - Mostrando valores zerados (sem consulta)');
    setSummary({
      totalReceitas: 0,
      receitasRecebidas: 0,
      receitasPrevistas: 0,
    });
    setInternalLoading(false);
  }, [refreshKey, dateFilter, receitas]);

  const calculateSummaryFromData = (data: any[]) => {
    console.log('[RECEITAS SUMMARY V2] 🧮 Calculando resumo a partir de dados:', {
      dataLength: data.length,
      sampleData: data.slice(0, 3).map(t => ({ title: t.title, amount: t.amount, status: t.status }))
    });
    
    const filtered = data.filter(t => {
      const isTransfer = t.title?.toLowerCase().includes('transferência') || 
                        t.title?.toLowerCase().includes('transfer');
      const isTransferCategory = t.categories?.name === 'Transferência entre Bancos';
      return !isTransfer && !isTransferCategory;
    });
    
    console.log('[RECEITAS SUMMARY V2] 🔍 Dados filtrados:', { 
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
    
    console.log('[RECEITAS SUMMARY V2] 📊 Cálculos a partir de dados:', { 
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

    console.log('[RECEITAS SUMMARY V2] ✅ Definindo resumo:', summaryData);
    setSummary(summaryData);
    onDataChange?.(summaryData);
    setInternalLoading(false);
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

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {getPeriodTitle("Total de Receitas do Mês")}
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
            Receitas Recebidas
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
            Receitas Previstas
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
