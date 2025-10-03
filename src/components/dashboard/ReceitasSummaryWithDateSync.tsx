import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilterWithThisMonth } from "@/components/ui/date-filter-with-this-month";
import { ReceitasSummary } from "./ReceitasSummary";

interface ReceitasSummaryWithDateSyncProps {
  refreshKey?: number;
  onDateFilterChange?: (filter: { from: Date | undefined; to: Date | undefined } | null) => void;
  onDataChange?: (data: { totalReceitas: number; receitasRecebidas: number; receitasPrevistas: number; }) => void;
  // Novos props para receber dados já carregados
  receitas?: any[];
  loading?: boolean;
  onDateFilterApplied?: (filter: { from: Date | undefined; to: Date | undefined } | null) => void;
}

export const ReceitasSummaryWithDateSync = ({ 
  refreshKey, 
  onDateFilterChange, 
  onDataChange,
  receitas,
  loading,
  onDateFilterApplied
}: ReceitasSummaryWithDateSyncProps) => {
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);

  // Debug: verificar dados recebidos
  console.log('[RECEITAS SUMMARY WITH DATE SYNC] 🔍 DEBUG - Props recebidas:', {
    refreshKey,
    receitasLength: receitas?.length || 0,
    loading,
    hasReceitas: !!receitas,
    receitasType: typeof receitas,
    timestamp: new Date().toISOString()
  });

  // Sincronizar o filtro com o componente pai
  useEffect(() => {
    onDateFilterChange?.(dateFilter);
    onDateFilterApplied?.(dateFilter);
  }, [dateFilter, onDateFilterChange, onDateFilterApplied]);

  const getPeriodTitle = () => {
    if (dateFilter === null) {
      return "Todas as Receitas";
    }
    if (dateFilter && dateFilter.from && dateFilter.to) {
      // Verificar se é o período máximo (desde 2020)
      const isMaximum = dateFilter.from.getFullYear() === 2020 && dateFilter.from.getMonth() === 0 && dateFilter.from.getDate() === 1;
      if (isMaximum) {
        return "Todas as Receitas (Máximo)";
      }
      return `Período: ${dateFilter.from.toLocaleDateString('pt-BR')} - ${dateFilter.to.toLocaleDateString('pt-BR')}`;
    }
    return "Receitas do Mês Atual";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle>{getPeriodTitle()}</CardTitle>
          <DateFilterWithThisMonth 
            onFilterChange={setDateFilter}
            className="sm:max-w-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ReceitasSummary 
          refreshKey={refreshKey} 
          dateFilter={dateFilter}
          onDataChange={onDataChange}
          receitas={receitas}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
};