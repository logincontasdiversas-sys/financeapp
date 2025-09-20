import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilter } from "@/components/ui/date-filter";
import { ReceitasSummary } from "./ReceitasSummary";

interface ReceitasSummaryWithDateSyncProps {
  refreshKey?: number;
  onDateFilterChange?: (filter: { from: Date | undefined; to: Date | undefined } | null) => void;
  onDataChange?: (data: { totalReceitas: number; receitasRecebidas: number; receitasPrevistas: number; }) => void;
}

export const ReceitasSummaryWithDateSync = ({ 
  refreshKey, 
  onDateFilterChange, 
  onDataChange 
}: ReceitasSummaryWithDateSyncProps) => {
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);

  // Sincronizar o filtro com o componente pai
  useEffect(() => {
    onDateFilterChange?.(dateFilter);
  }, [dateFilter, onDateFilterChange]);

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
          <DateFilter 
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
        />
      </CardContent>
    </Card>
  );
};