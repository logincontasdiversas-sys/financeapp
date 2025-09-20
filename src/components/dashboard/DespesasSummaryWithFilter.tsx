import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilter } from "@/components/ui/date-filter";
import DespesasSummary from "./DespesasSummary";

interface DespesasSummaryWithFilterProps {
  refreshKey?: number;
  onDataChange?: (data: { totalDespesas: number; despesasPagas: number; despesasPendentes: number; }) => void;
}

export const DespesasSummaryWithFilter = ({ refreshKey, onDataChange }: DespesasSummaryWithFilterProps) => {
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);

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
          <DateFilter 
            onFilterChange={setDateFilter}
            className="sm:max-w-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        <DespesasSummary 
          refreshKey={refreshKey} 
          dateFilter={dateFilter}
          onDataChange={onDataChange}
        />
      </CardContent>
    </Card>
  );
};