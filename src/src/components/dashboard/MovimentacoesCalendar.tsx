import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useTenant } from "@/hooks/useTenant";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: string;
  kind: 'income' | 'expense';
}

export const MovimentacoesCalendar = () => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && tenantId) {
      loadTransactions();
    }
  }, [user, tenantId]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, title, amount, date, status, kind')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Filter out transactions with null or empty dates and ensure valid kinds
      const validTransactions = (data || [])
        .filter(t => t.date && t.date.trim() !== '')
        .filter(t => t.kind === 'income' || t.kind === 'expense')
        .map(t => ({
          ...t,
          kind: t.kind as 'income' | 'expense'
        }));
      console.log('[MOVIMENTACOES CALENDAR] Valid transactions:', validTransactions);
      
      setTransactions(validTransactions);
    } catch (error) {
      console.error('[MOVIMENTACOES CALENDAR] Error loading transactions:', error);
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

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString);
  };

  const getTransactionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return transactions.filter(t => t.date === dateStr);
  };

  const getDatesWithTransactions = () => {
    const validDates = transactions
      .filter(t => {
        // Check if transaction has a valid date
        if (!t.date || t.date.trim() === '') return false;
        
        const date = new Date(t.date);
        return !isNaN(date.getTime());
      })
      .map(t => new Date(t.date));
    
    console.log('[MOVIMENTACOES CALENDAR] Dates with transactions:', validDates);
    return validDates;
  };

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Calendário de Movimentações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("rounded-md border pointer-events-auto")}
              modifiers={{
                hasTransaction: (date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const hasTransaction = transactions.some(t => t.date === dateStr);
                  return hasTransaction;
                },
                today: (date) => {
                  const today = new Date();
                  return date.toDateString() === today.toDateString();
                }
              }}
              modifiersStyles={{
                hasTransaction: {
                  backgroundColor: '#8b5cf6', // roxo para dias com movimentações
                  color: 'white',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                },
                today: {
                  backgroundColor: '#c4b5fd', // roxo claro para hoje
                  color: '#1f2937',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: '2px solid #8b5cf6'
                },
              }}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Dias destacados possuem movimentações registradas
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">
              Movimentações do Dia
            </h3>
            
            {selectedDateTransactions.length > 0 ? (
              <div className="space-y-2">
                {selectedDateTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={transaction.status === 'settled' ? 'default' : 'secondary'}>
                          {transaction.status === 'settled' ? 'Pago' : 'Pendente'}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={transaction.kind === 'income' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}
                        >
                          {transaction.kind === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.kind === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.kind === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma movimentação registrada para esta data</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};