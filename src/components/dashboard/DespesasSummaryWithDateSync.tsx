import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilterWithThisMonth } from "@/components/ui/date-filter-with-this-month";
import DespesasSummary from "./DespesasSummary";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { logger } from "@/utils/logger";

interface DespesasSummaryWithDateSyncProps {
  refreshKey?: number;
  onDateFilterChange?: (filter: { from: Date | undefined; to: Date | undefined } | null) => void;
  onDateFilterApplied?: (filter: { from: Date | undefined; to: Date | undefined } | null) => void;
  onDataChange?: (data: { totalDespesas: number; despesasPagas: number; despesasPendentes: number; }) => void;
}

export const DespesasSummaryWithDateSync = ({ 
  refreshKey: externalRefreshKey, 
  onDateFilterChange, 
  onDateFilterApplied,
  onDataChange 
}: DespesasSummaryWithDateSyncProps) => {
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  // Realtime sync para despesas
  useRealtimeSync({
    table: 'transactions',
    onInsert: (payload) => {
      if (payload.new?.kind === 'expense') {
        logger.info('DESPESAS_SUMMARY_REALTIME', 'Nova despesa detectada');
        setInternalRefreshKey(prev => prev + 1);
      }
    },
    onUpdate: (payload) => {
      if (payload.new?.kind === 'expense' || payload.old?.kind === 'expense') {
        logger.info('DESPESAS_SUMMARY_REALTIME', 'Despesa atualizada detectada');
        setInternalRefreshKey(prev => prev + 1);
      }
    },
    onDelete: (payload) => {
      if (payload.old?.kind === 'expense') {
        logger.info('DESPESAS_SUMMARY_REALTIME', 'Despesa removida detectada');
        setInternalRefreshKey(prev => prev + 1);
      }
    },
  });

  // Sincronizar o filtro com o componente pai
  useEffect(() => {
    onDateFilterChange?.(dateFilter);
    onDateFilterApplied?.(dateFilter);
  }, [dateFilter, onDateFilterChange, onDateFilterApplied]);

  const getPeriodTitle = () => {
    if (dateFilter === null) {
      return "Todas as Despesas";
    }
    if (dateFilter && dateFilter.from && dateFilter.to) {
      // Verificar se é o período máximo (desde 2020)
      const isMaximum = dateFilter.from.getFullYear() === 2020 && dateFilter.from.getMonth() === 0 && dateFilter.from.getDate() === 1;
      if (isMaximum) {
        return "Todas as Despesas (Máximo)";
      }
      return `Período: ${dateFilter.from.toLocaleDateString('pt-BR')} - ${dateFilter.to.toLocaleDateString('pt-BR')}`;
    }
    return "Despesas do Mês Atual";
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
        <DespesasSummary 
          refreshKey={externalRefreshKey || internalRefreshKey} 
          dateFilter={dateFilter}
          onDataChange={onDataChange}
        />
      </CardContent>
    </Card>
  );
};