import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FinancialSummaryProps {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  saldoBancos?: number;
  saldoMesPassado?: number;
  loading?: boolean;
  isProjection?: boolean;
  isMaximum?: boolean;
  isBalanceVisible?: boolean;
}

export const FinancialSummary = ({ totalReceitas, totalDespesas, saldo, saldoBancos, saldoMesPassado, loading, isProjection, isMaximum, isBalanceVisible = true }: FinancialSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
    <>
      {/* Versão Mobile - Unificada */}
      <div className="block sm:hidden">
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {isMaximum ? "Saldo Histórico Total" : 
                   isProjection ? "Saldo Projetado" : "Saldo Total"}
                </CardTitle>
                <div className={`text-3xl font-bold mt-2 ${saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {isBalanceVisible ? formatCurrency(saldo) : '••••••'}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="p-2">
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Saldo do Mês Passado */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <TrendingUpIcon className={`h-5 w-5 ${(saldoMesPassado || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isMaximum ? "Saldo Inicial" : "Saldo do Mês Passado"}
                      </p>
                      <p className={`text-lg font-semibold ${(saldoMesPassado || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {formatCurrency(saldoMesPassado || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Receitas */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <ArrowUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isMaximum ? "Total Receitas Histórico" : 
                         isProjection ? "Receitas Previstas" : "Receitas do Mês"}
                      </p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(totalReceitas)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Despesas */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <ArrowDownIcon className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isMaximum ? "Total Despesas Histórico" : 
                         isProjection ? "Despesas Previstas" : "Despesas do Mês"}
                      </p>
                      <p className="text-lg font-semibold text-destructive">
                        {formatCurrency(totalDespesas)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Versão Desktop - Original */}
      <div className="hidden sm:grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
    </>
  );
};