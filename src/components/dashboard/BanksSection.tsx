import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCardIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTenant } from "@/hooks/useTenant";

interface Bank {
  id: string;
  name: string;
  balance: number;
  account_type: string;
}

interface BankWithCalculatedBalance extends Bank {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyMovement: number;
  trend: 'up' | 'down' | 'stable';
}

interface BanksSectionProps {
  startDate?: Date;
  endDate?: Date;
}

export const BanksSection = ({ startDate, endDate }: BanksSectionProps) => {
  const { tenantId } = useTenant();
  const [banks, setBanks] = useState<BankWithCalculatedBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      loadBanks();
    }
  }, [tenantId, startDate, endDate]);

  // Realtime sync para atualizar saldos quando transações mudarem
  useRealtimeSync({
    table: 'transactions',
    debounceMs: 500,
    onInsert: () => loadBanks(),
    onUpdate: () => loadBanks(),
    onDelete: () => loadBanks(),
  });

  const loadBanks = async () => {
    if (!tenantId) return;
    
    try {
      // Buscar bancos
      const { data: banksData, error: banksError } = await supabase
        .from('banks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      console.log(`[BANKS_DEBUG] Found ${banksData?.length || 0} banks for tenant ${tenantId}`);

      if (banksError) throw banksError;

      if (!banksData || banksData.length === 0) {
        setBanks([]);
        return;
      }

      // Calcular saldo de cada banco com base no saldo inicial + transações históricas
      const banksWithBalances = await Promise.all(
        banksData.map(async (bank) => {
          // Buscar TODAS as transações do banco para cálculo do saldo histórico
          const { data: allTransactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount, kind, status, date')
            .eq('bank_id', bank.id)
            .eq('tenant_id', tenantId)
            .order('date', { ascending: true }); // Ordenar do mais antigo para o mais recente

          console.log(`[BANKS_DEBUG] Fetching ALL transactions for bank ${bank.name}`);

          if (transactionsError) {
            console.error(`[BANKS_DEBUG] Error fetching transactions for bank ${bank.name}:`, transactionsError);
          }

          // Debug: Log raw transaction data
          if (allTransactions && allTransactions.length > 0) {
            console.log(`[BANKS_DEBUG] Raw transactions for ${bank.name}:`, allTransactions);
          }

          // Calcular saldo atual e dados do mês vigente
          const initialBalance = Number(bank.balance || 0);
          let currentBalance = initialBalance; // Saldo atual = saldo inicial + transações
          let monthlyIncome = 0;
          let monthlyExpense = 0;
          let settledCount = 0;

      // Usar datas do filtro ou mês atual (Brasília)
      const now = new Date();
      const brasiliaDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      
      let filterStartDate: Date;
      let filterEndDate: Date;

      if (startDate && endDate) {
        // Usar datas do filtro, normalizando para start-of-day
        filterStartDate = new Date(startDate);
        filterStartDate.setHours(0, 0, 0, 0);
        
        filterEndDate = new Date(endDate);
        filterEndDate.setHours(23, 59, 59, 999);
      } else {
        // Usar mês atual (Brasília), normalizando para start-of-day
        filterStartDate = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth(), 1);
        filterStartDate.setHours(0, 0, 0, 0);
        
        filterEndDate = new Date(brasiliaDate.getFullYear(), brasiliaDate.getMonth() + 1, 0);
        filterEndDate.setHours(23, 59, 59, 999);
      }
      
          
          const currentMonth = filterStartDate.getMonth();
          const currentYear = filterStartDate.getFullYear();

          if (allTransactions) {
            
            allTransactions.forEach(transaction => {
              const transactionDate = new Date(transaction.date);
              // Normalizar data da transação para start-of-day
              transactionDate.setHours(0, 0, 0, 0);
              
              // Comparação direta de Date objects normalizados
              const isInFilterPeriod = transactionDate >= filterStartDate && transactionDate <= filterEndDate;

              // Para o saldo atual: considerar TODAS as transações 'settled' (histórico completo)
              // Incluir transferências no cálculo do saldo (afetam o saldo individual do banco)
              if (transaction.status === 'settled') {
                if (transaction.kind === 'income') {
                  currentBalance += Number(transaction.amount);
                } else if (transaction.kind === 'expense') {
                  currentBalance -= Number(transaction.amount);
                }
              }

              // Para dados do período: considerar apenas transações do período filtrado e 'settled'
              // Incluir transferências nos dados do período (são movimentações reais do banco)
              if (transaction.status === 'settled' && isInFilterPeriod) {
                settledCount++;
                if (transaction.kind === 'income') {
                  monthlyIncome += Number(transaction.amount);
                } else if (transaction.kind === 'expense') {
                  monthlyExpense += Number(transaction.amount);
                }
              }
            });
            
            console.log(`[BANKS_DEBUG] Current balance for ${bank.name}: ${currentBalance}`);
            console.log(`[BANKS_DEBUG] Monthly totals for ${bank.name}: income=${monthlyIncome}, expense=${monthlyExpense}, movement=${monthlyIncome - monthlyExpense}`);
            console.log(`[BANKS_DEBUG] Settled transactions this month: ${settledCount}`);
          } else {
            console.log(`[BANKS_DEBUG] Bank ${bank.name}: No transactions found`);
          }

          const monthlyMovement = monthlyIncome - monthlyExpense;
          
          // Determinar tendência baseada na movimentação mensal
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (monthlyMovement > 0) {
            trend = 'up';
          } else if (monthlyMovement < 0) {
            trend = 'down';
          }

          return {
            ...bank,
            currentBalance,
            monthlyIncome,
            monthlyExpense,
            monthlyMovement,
            trend,
          };
        })
      );

      setBanks(banksWithBalances);
    } catch (error) {
      console.error('[BANKS] Error loading banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  // Função para obter ícone de tendência
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDownIcon className="h-4 w-4 text-red-600" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bancos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div className="h-4 w-24 bg-muted-foreground/20 rounded"></div>
                <div className="h-4 w-16 bg-muted-foreground/20 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5" />
          Bancos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {banks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum banco cadastrado
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {banks.map((bank) => (
              <div key={bank.id} className="p-3 bg-muted/50 rounded-lg border">
                {/* Header do banco com nome */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm leading-tight truncate">{bank.name}</h3>
                </div>

                {/* Saldo atual - destaque principal */}
                <div className="mb-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-muted-foreground">Saldo:</p>
                    <p className={`font-bold text-lg leading-tight ${bank.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(bank.currentBalance)}
                    </p>
                  </div>
                </div>

                {/* Informações do mês - mais compactas */}
                <div className="space-y-1 text-[11px] leading-tight">
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">Receitas:</span>
                    <span className="text-green-600 font-medium">{formatCurrency(bank.monthlyIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">Despesas:</span>
                    <span className="text-red-600 font-medium">{formatCurrency(bank.monthlyExpense)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};