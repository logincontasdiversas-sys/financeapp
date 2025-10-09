import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from "lucide-react";

interface FinancialSummaryProps {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  saldoBancos?: number;
  saldoMesPassado?: number;
  loading?: boolean;
  isProjection?: boolean;
  isMaximum?: boolean;
}

export const FinancialSummary = ({ totalReceitas, totalDespesas, saldo, saldoBancos, saldoMesPassado, loading, isProjection, isMaximum }: FinancialSummaryProps) => {
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
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {isMaximum ? "Saldo Inicial" : "Saldo do Mês Passado"}
          </CardTitle>
          <TrendingUpIcon className={`h-4 w-4 ${(saldoMesPassado || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className={`text-2xl font-bold ${(saldoMesPassado || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
            {formatCurrency(saldoMesPassado || 0)}
          </div>
          {isMaximum && (
            <p className="text-xs text-muted-foreground mt-1">
              Saldo inicial dos bancos
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {isMaximum ? "Total Receitas Histórico" : 
             isProjection ? "Receitas Previstas" : "Receitas do Mês"}
          </CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalReceitas)}
          </div>
          {isProjection && (
            <p className="text-xs text-muted-foreground mt-1">
              Inclui transações pendentes
            </p>
          )}
          {isMaximum && (
            <p className="text-xs text-muted-foreground mt-1">
              Todas as receitas desde 2020
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {isMaximum ? "Total Despesas Histórico" : 
             isProjection ? "Despesas Previstas" : "Despesas do Mês"}
          </CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(totalDespesas)}
          </div>
          {isProjection && (
            <p className="text-xs text-muted-foreground mt-1">
              Inclui transações pendentes
            </p>
          )}
          {isMaximum && (
            <p className="text-xs text-muted-foreground mt-1">
              Todas as despesas desde 2020
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-sm font-medium">
            {isMaximum ? "Saldo Histórico Total" : 
             isProjection ? "Saldo Projetado" : "Saldo Total"}
          </CardTitle>
          <TrendingUpIcon className={`h-4 w-4 ${saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent className="pt-1 sm:pt-0">
          <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
            {formatCurrency(saldo)}
          </div>
          {isProjection && (
            <p className="text-xs text-muted-foreground mt-1">
              Projeção baseada em transações pendentes
            </p>
          )}
          {isMaximum && (
            <p className="text-xs text-muted-foreground mt-1">
              Saldo acumulado desde 2020
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};