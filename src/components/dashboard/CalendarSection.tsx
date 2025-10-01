import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  kind: string;
  status: string;
}

interface CalendarSectionProps {
  startDate?: Date;
  endDate?: Date;
}

export const CalendarSection = ({ startDate, endDate }: CalendarSectionProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && tenantId) {
      loadTransactions();
    }
  }, [user, tenantId, startDate, endDate]);

  const loadTransactions = async () => {
    if (!tenantId) return;
    
    try {
      // Usar datas do filtro ou período padrão
      let startDateStr: string;
      let endDateStr: string;
      
      if (startDate && endDate) {
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
        console.log('[CALENDAR SECTION] Usando período filtrado:', { startDateStr, endDateStr });
      } else {
        // Carregar transações dos últimos 6 meses para garantir que todas as datas sejam capturadas
        const defaultStartDate = new Date();
        defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);
        startDateStr = defaultStartDate.toISOString().split('T')[0];
        
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 6);
        endDateStr = defaultEndDate.toISOString().split('T')[0];
        console.log('[CALENDAR SECTION] Usando período padrão:', { startDateStr, endDateStr });
      }

      const [incomeData, expenseData] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, title, amount, date, kind, status')
          .eq('kind', 'income')
          .eq('tenant_id', tenantId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .order('date'),
        
        supabase
          .from('transactions')
          .select('id, title, amount, date, kind, status')
          .eq('kind', 'expense')
          .eq('tenant_id', tenantId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .order('date')
      ]);

      // Filtrar transações com datas válidas e normalizar formato
      const validIncomeTransactions = (incomeData.data || [])
        .filter(t => t.date && t.date.trim() !== '')
        .map(t => ({
          ...t,
          date: t.date.split('T')[0] // Garantir formato YYYY-MM-DD
        }));
        
      const validExpenseTransactions = (expenseData.data || [])
        .filter(t => t.date && t.date.trim() !== '')
        .map(t => ({
          ...t,
          date: t.date.split('T')[0] // Garantir formato YYYY-MM-DD
        }));

      console.log('[CALENDAR SECTION] Income transactions loaded:', validIncomeTransactions.length);
      console.log('[CALENDAR SECTION] Expense transactions loaded:', validExpenseTransactions.length);
      console.log('[CALENDAR SECTION] Sample income dates:', validIncomeTransactions.slice(0, 5).map(t => t.date));
      console.log('[CALENDAR SECTION] Sample expense dates:', validExpenseTransactions.slice(0, 5).map(t => t.date));

      setIncomeTransactions(validIncomeTransactions);
      setExpenseTransactions(validExpenseTransactions);
    } catch (error) {
      console.error('[CALENDAR] Error loading transactions:', error);
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

  const getTransactionsForDate = (transactions: Transaction[], date: Date | undefined) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    const foundTransactions = transactions.filter(t => t.date === dateStr);
    
    if (foundTransactions.length > 0) {
      console.log(`[CALENDAR SECTION] Found ${foundTransactions.length} transactions for ${dateStr}:`, foundTransactions);
    }
    
    return foundTransactions;
  };

  const getTransactionDates = (transactions: Transaction[]) => {
    const dates = transactions
      .filter(t => t.date && t.date.trim() !== '')
      .map(t => {
        // Normalizar formato de data
        const dateStr = t.date.split('T')[0]; // Remove time se houver
        const date = new Date(dateStr + 'T00:00:00'); // Força timezone local
        return date;
      })
      .filter(date => !isNaN(date.getTime()));
    
    console.log('[CALENDAR SECTION] Transaction dates for highlighting:', dates.map(d => d.toISOString().split('T')[0]));
    return dates;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderTransactionsList = (transactions: Transaction[], kind: 'income' | 'expense') => {
    const selectedTransactions = getTransactionsForDate(transactions, selectedDate);
    
    if (selectedTransactions.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-4">
          Nenhuma {kind === 'income' ? 'receita' : 'despesa'} neste dia
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {selectedTransactions.map((transaction) => (
          <div key={transaction.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <div>
              <p className="font-medium">{transaction.title}</p>
              <Badge variant={transaction.status === 'settled' ? 'default' : 'secondary'}>
                {transaction.status === 'settled' ? 'Faturado' : 'Pendente'}
              </Badge>
            </div>
            <p className={`font-bold ${kind === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        ))}
        <div className="pt-2 border-t">
          <p className="text-sm font-medium">
            Total: <span className={kind === 'income' ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(selectedTransactions.reduce((sum, t) => sum + t.amount, 0))}
            </span>
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded mb-4"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user || !tenantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendário</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Carregando dados do usuário...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Calendário
        </CardTitle>
        {/* Debug info - remover depois */}
        <div className="text-xs text-muted-foreground">
          Receitas: {incomeTransactions.length} | Despesas: {expenseTransactions.length}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="income" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="income" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasTransaction: getTransactionDates(incomeTransactions),
                    today: (date) => isToday(date)
                  }}
                  modifiersStyles={{
                    hasTransaction: { 
                      backgroundColor: '#8b5cf6', // roxo para dias com movimentações
                      color: 'white', 
                      fontWeight: 'bold',
                      borderRadius: '6px'
                    },
                    today: {
                      backgroundColor: '#c4b5fd', // roxo claro para hoje
                      color: '#1f2937',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: '2px solid #8b5cf6'
                    }
                  }}
                  className="rounded-md border"
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">
                  Receitas de {selectedDate?.toLocaleDateString('pt-BR')}
                </h4>
                {renderTransactionsList(incomeTransactions, 'income')}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="expense" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasTransaction: getTransactionDates(expenseTransactions),
                    today: (date) => isToday(date)
                  }}
                  modifiersStyles={{
                    hasTransaction: { 
                      backgroundColor: '#8b5cf6', // roxo para dias com movimentações
                      color: 'white', 
                      fontWeight: 'bold',
                      borderRadius: '6px'
                    },
                    today: {
                      backgroundColor: '#c4b5fd', // roxo claro para hoje
                      color: '#1f2937',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: '2px solid #8b5cf6'
                    }
                  }}
                  className="rounded-md border"
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">
                  Despesas de {selectedDate?.toLocaleDateString('pt-BR')}
                </h4>
                {renderTransactionsList(expenseTransactions, 'expense')}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};