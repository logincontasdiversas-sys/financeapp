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

interface ExpenseTransaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: string;
}

const DespesasCalendar = () => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && tenantId) {
      loadTransactions();
    }
  }, [user, tenantId]);

  const loadTransactions = async () => {
    if (!tenantId) return;
    
    try {
      // Carregar transações dos últimos 6 meses para garantir que todas as datas sejam capturadas
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log('[DESPESAS CALENDAR] Loading transactions from', startDateStr, 'to', endDateStr);

      const { data, error } = await supabase
        .from('transactions')
        .select('id, title, amount, date, status')
        .eq('kind', 'expense')
        .eq('tenant_id', tenantId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Filtrar transações com datas válidas e normalizar formato
      const validTransactions = (data || [])
        .filter(t => t.date && t.date.trim() !== '')
        .map(t => ({
          ...t,
          date: t.date.split('T')[0] // Garantir formato YYYY-MM-DD
        }));
        
      console.log('[DESPESAS CALENDAR] Transactions loaded:', validTransactions.length);
      console.log('[DESPESAS CALENDAR] Sample dates:', validTransactions.slice(0, 5).map(t => t.date));
      
      setTransactions(validTransactions);
    } catch (error) {
      console.error('[DESPESAS CALENDAR] Error loading transactions:', error);
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
    const dates = transactions
      .filter(t => t.date && t.date.trim() !== '')
      .map(t => {
        // Normalizar formato de data
        const dateStr = t.date.split('T')[0]; // Remove time se houver
        const date = new Date(dateStr + 'T00:00:00'); // Força timezone local
        return date;
      })
      .filter(date => !isNaN(date.getTime()));
    
    console.log('[DESPESAS CALENDAR] Transaction dates for highlighting:', dates.map(d => d.toISOString().split('T')[0]));
    return dates;
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
          Calendário de Despesas
        </CardTitle>
        {/* Debug info - remover depois */}
        <div className="text-xs text-muted-foreground">
          Total de Despesas: {transactions.length}
        </div>
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
              Dias destacados possuem despesas registradas
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">
              Despesas do Dia
            </h3>
            
            {selectedDateTransactions.length > 0 ? (
              <div className="space-y-2">
                {selectedDateTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.title}</p>
                      <Badge variant={transaction.status === 'settled' ? 'default' : 'secondary'}>
                        {transaction.status === 'settled' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma despesa registrada para esta data</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DespesasCalendar;