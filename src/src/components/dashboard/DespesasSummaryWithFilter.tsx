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