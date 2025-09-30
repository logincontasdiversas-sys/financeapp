import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface SimpleBankSummaryProps {
  bankId?: string;
}

interface BankWithTransactions {
  id: string;
  name: string;
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}

const SimpleBankSummary = ({ bankId }: SimpleBankSummaryProps) => {
  const { tenantId } = useTenant();
  const [banks, setBanks] = useState<BankWithTransactions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      console.log('[SIMPLE_BANK_SUMMARY] 🔄 Carregando bancos com tenantId:', tenantId);
      loadBanks();
    } else {
      console.log('[SIMPLE_BANK_SUMMARY] ⏳ Aguardando tenantId...');
    }
  }, [tenantId]);

  const loadBanks = async () => {
    try {
      setLoading(true);
      console.log('[SIMPLE_BANK_SUMMARY] Loading banks...');
      
      const { data: banks, error } = await supabase
        .from('banks')
        .select('id, name, balance')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[SIMPLE_BANK_SUMMARY] Error:', error);
        return;
      }

      if (!banks || banks.length === 0) {
        setBanks([]);
        return;
      }

      // Buscar transações para cada banco
      const banksWithTransactions: BankWithTransactions[] = [];
      
      for (const bank of banks) {
        if (bankId && bank.id !== bankId) continue;

        // Buscar todas as transações do banco (histórico completo)
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount, kind, status')
          .eq('tenant_id', tenantId)
          .eq('bank_id', bank.id)
          .eq('status', 'settled');

        if (transactionsError) {
          console.error(`[SIMPLE_BANK_SUMMARY] Error fetching transactions for bank ${bank.name}:`, transactionsError);
        }

        const totalIncome = (transactions || [])
          .filter(t => t.kind === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = (transactions || [])
          .filter(t => t.kind === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const transactionCount = (transactions || []).length;

        banksWithTransactions.push({
          id: bank.id,
          name: bank.name,
          balance: bank.balance,
          totalIncome,
          totalExpenses,
          transactionCount
        });
      }

      console.log('[SIMPLE_BANK_SUMMARY] Banks with transactions loaded:', banksWithTransactions);
      setBanks(banksWithTransactions);
    } catch (error) {
      console.error('[SIMPLE_BANK_SUMMARY] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando bancos...</div>
        </CardContent>
      </Card>
    );
  }

  if (banks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum banco encontrado</h3>
          <p className="text-muted-foreground">
            Cadastre bancos para ver o resumo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Resumo</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {banks.map((bank) => (
          <Card key={bank.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {bank.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">Receitas</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(bank.totalIncome)}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">Despesas</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(bank.totalExpenses)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de Transações</span>
                  <span className="text-sm font-medium">{bank.transactionCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SimpleBankSummary;
