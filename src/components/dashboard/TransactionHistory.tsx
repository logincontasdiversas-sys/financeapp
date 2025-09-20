import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HistoryIcon, ArrowUpIcon, ArrowDownIcon, ArrowRightLeftIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { useTenant } from "@/hooks/useTenant";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  kind: 'income' | 'expense' | 'transfer';
  status: string;
  category: {
    name: string;
    emoji: string;
  } | null;
}

export const TransactionHistory = () => {
  const { tenantId } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      loadTransactions();
    }
  }, [tenantId]);

  const loadTransactions = async () => {
    if (!tenantId) return;
    
    try {
      // Obter o primeiro e último dia do mês atual
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          kind,
          status,
          categories (
            name,
            emoji
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'settled') // Apenas transações recebidas/pagas
        .neq('kind', 'transfer') // Excluir transferências dos relatórios
        .gte('date', firstDay.toISOString().split('T')[0]) // A partir do primeiro dia do mês
        .lte('date', lastDay.toISOString().split('T')[0]) // Até o último dia do mês
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        category: item.categories ? {
          name: item.categories.name,
          emoji: item.categories.emoji
        } : null
      })) || [];

      setTransactions(formattedData);
    } catch (error) {
      console.error('[HISTORY] Error loading transactions:', error);
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

  const formatDate = (date: string) => {
    return formatDateForDisplay(date);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'settled': { label: 'Faturado', variant: 'default' as const },
      'pending': { label: 'À Receber', variant: 'secondary' as const },
      'scheduled': { label: 'Agendado', variant: 'outline' as const }
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div className="flex gap-3">
                  <div className="h-8 w-8 bg-muted-foreground/20 rounded-full"></div>
                  <div>
                    <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-1"></div>
                    <div className="h-3 w-20 bg-muted-foreground/20 rounded"></div>
                  </div>
                </div>
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
          <HistoryIcon className="h-5 w-5" />
          Movimentações do Mês (Recebidas/Pagas)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma transação recebida/paga neste mês
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    transaction.kind === 'income' ? 'bg-green-100 text-green-600' : 
                    transaction.kind === 'expense' ? 'bg-red-100 text-red-600' : 
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {transaction.kind === 'income' ? (
                      <ArrowDownIcon className="h-4 w-4" />
                    ) : transaction.kind === 'expense' ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowRightLeftIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {transaction.category?.emoji && (
                        <span className="text-sm">{transaction.category.emoji}</span>
                      )}
                      <p className="font-medium">{transaction.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                      <Badge variant={getStatusBadge(transaction.status).variant}>
                        {getStatusBadge(transaction.status).label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    transaction.kind === 'income' ? 'text-green-600' : 
                    transaction.kind === 'expense' ? 'text-red-600' : 
                    'text-blue-600'
                  }`}>
                    {transaction.kind === 'income' ? '+' : 
                     transaction.kind === 'expense' ? '-' : 
                     '↔'}{formatCurrency(transaction.amount)}
                  </p>
                  {transaction.category && (
                    <p className="text-sm text-muted-foreground">
                      {transaction.category.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};