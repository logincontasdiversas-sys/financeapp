import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStableAuth } from '@/hooks/useStableAuth';
import { useTenant } from '@/hooks/useTenant';
import { formatDateForDisplay } from '@/utils/dateUtils';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: string;
  kind: string;
  categories?: {
    name: string;
    emoji: string;
  };
  note?: string;
}

interface CardTransactionsProps {
  cardId: string;
  cardName: string;
}

export const CardTransactions = ({ cardId, cardName }: CardTransactionsProps) => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && tenantId && cardId) {
      loadTransactions();
    }
  }, [user, tenantId, cardId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Buscar transações do cartão (despesas no cartão)
      const { data: cardTransactions, error: cardError } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          status,
          kind,
          note,
          categories (
            name,
            emoji
          )
        `)
        .eq('card_id', cardId)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (cardError) throw cardError;

      // Buscar pagamentos de fatura (despesas com categoria de fatura deste cartão)
      const { data: invoicePayments, error: invoiceError } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          status,
          kind,
          note,
          categories!inner (
            name,
            emoji
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('kind', 'expense')
        .ilike('categories.name', `%${cardName} - Fatura%`);

      if (invoiceError) throw invoiceError;

      // Combinar todas as transações
      const allTransactions = [
        ...(cardTransactions || []),
        ...(invoicePayments || [])
      ];

      // Remover duplicatas e ordenar por data
      const uniqueTransactions = allTransactions.filter((transaction, index, arr) => 
        arr.findIndex(t => t.id === transaction.id) === index
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(uniqueTransactions);
    } catch (error) {
      console.error('[CARD_TRANSACTIONS] Error loading:', error);
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

  const getTransactionType = (transaction: Transaction) => {
    if (transaction.categories?.name.includes('- Fatura')) {
      return { type: 'payment', label: 'Pagamento Fatura', color: 'bg-blue-100 text-blue-800' };
    }
    return { type: 'expense', label: 'Compra', color: 'bg-red-100 text-red-800' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimentações - {cardName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
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
          💳 Movimentações - {cardName}
          <Badge variant="outline">{transactions.length} transações</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma movimentação encontrada para este cartão</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const transactionType = getTransactionType(transaction);
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell className="font-medium">{transaction.title}</TableCell>
                    <TableCell>
                      {transaction.categories ? (
                        <span>{transaction.categories.emoji} {transaction.categories.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Sem categoria</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={transactionType.color}>
                        {transactionType.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.status === 'settled' ? 'default' : 'secondary'}>
                        {transaction.status === 'settled' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={transactionType.type === 'payment' ? 'text-blue-600' : 'text-red-600'}>
                        {transactionType.type === 'payment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};