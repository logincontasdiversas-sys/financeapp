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
  category_id?: string;
  categories: {
    id: string;
    name: string;
    emoji: string;
  } | null;
}

interface TransactionHistoryProps {
  startDate?: Date;
  endDate?: Date;
}

export const TransactionHistory = ({ startDate, endDate }: TransactionHistoryProps) => {
  const { tenantId } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      console.log('[HISTORY] 🔄 Carregando transações com tenantId:', tenantId);
      loadTransactions();
    } else {
      console.log('[HISTORY] ⏳ Aguardando tenantId...');
    }
  }, [tenantId, startDate, endDate]);

  const loadTransactions = async () => {
    if (!tenantId) {
      console.log('[HISTORY] ⏳ Aguardando tenantId...');
      return;
    }
    
    console.log('[HISTORY] 🔄 CACHE FORÇADO - Carregando transações:', { tenantId, version: '4.0.0-CACHE-FORCED' });
    
    try {
      // Usar datas do filtro ou mês atual
      let filterStartDate: Date;
      let filterEndDate: Date;
      
      if (startDate && endDate) {
        // Usar datas do filtro
        filterStartDate = new Date(startDate);
        filterStartDate.setHours(0, 0, 0, 0);
        filterEndDate = new Date(endDate);
        filterEndDate.setHours(23, 59, 59, 999);
      } else {
        // Usar mês atual
        const now = new Date();
        filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        filterStartDate.setHours(0, 0, 0, 0);
        filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filterEndDate.setHours(23, 59, 59, 999);
      }
      
      const startDateStr = filterStartDate.toISOString().split('T')[0];
      const endDateStr = filterEndDate.toISOString().split('T')[0];
      
      console.log('[HISTORY] 🔄 Usando período:', { startDateStr, endDateStr, hasFilter: !!(startDate && endDate) });
      
      // Primeiro, buscar as transações sem JOIN para evitar erro de relacionamento
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          kind,
          status,
          category_id
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'settled') // Apenas transações recebidas/pagas
        .gte('date', startDateStr) // A partir da data inicial do filtro
        .lte('date', endDateStr) // Até a data final do filtro
        .order('date', { ascending: false })
        .limit(20); // Aumentar limite para mostrar mais transações

      if (transactionsError) {
        console.error('[HISTORY] Error fetching transactions:', transactionsError);
        throw transactionsError;
      }

      // Buscar categorias separadamente
      const categoryIds = [...new Set(transactionsData?.map(t => t.category_id).filter(Boolean) || [])];
      let categoriesData: any[] = [];
      
      if (categoryIds.length > 0) {
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, emoji')
          .in('id', categoryIds);
        
        if (categoriesError) {
          console.error('[HISTORY] Error fetching categories:', categoriesError);
        } else {
          categoriesData = categories || [];
        }
      }

      // Combinar transações com categorias
      const data = transactionsData?.map(transaction => ({
        ...transaction,
        categories: categoriesData.find(cat => cat.id === transaction.category_id) || null
      })) || [];

      console.log('[HISTORY] Query result:', {
        dataLength: data?.length || 0,
        sampleData: data?.slice(0, 3).map(t => ({ 
          title: t.title, 
          amount: t.amount, 
          date: t.date, 
          kind: t.kind, 
          status: t.status 
        })),
        queryParams: { startDateStr, endDateStr, tenantId }
      });

      // Debug: Verificar se há transações no banco de dados para o período
      if (data?.length === 0) {
        console.log('[HISTORY] 🔍 Nenhuma transação encontrada. Verificando se há transações no banco...');
        
        // Verificar todas as transações do tenant
        const { data: allTenantTransactions, error: allError } = await supabase
          .from('transactions')
          .select('id, title, amount, date, kind, status')
          .eq('tenant_id', tenantId)
          .order('date', { ascending: false })
          .limit(5);
        
        if (allError) {
          console.error('[HISTORY] Erro ao buscar todas as transações:', allError);
        } else {
          console.log('[HISTORY] 📊 Total de transações do tenant:', allTenantTransactions?.length || 0);
          if (allTenantTransactions && allTenantTransactions.length > 0) {
            console.log('[HISTORY] 📋 Últimas 5 transações do tenant:');
            allTenantTransactions.forEach((t, i) => {
              console.log(`  ${i + 1}. ${t.title} - R$ ${t.amount} - ${t.date} - ${t.kind} - ${t.status}`);
            });
          }
        }
      }

      const formattedData = data || [];

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

  const getTitle = () => {
    if (startDate && endDate) {
      const startStr = startDate.toLocaleDateString('pt-BR');
      const endStr = endDate.toLocaleDateString('pt-BR');
      return `Movimentações (${startStr} - ${endStr})`;
    }
    return 'Movimentações do Mês Atual';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
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
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <HistoryIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma transação recebida/paga no período selecionado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {startDate && endDate ? 'Tente selecionar um período diferente' : 'Adicione receitas e despesas para ver as movimentações'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg w-full min-w-0">
                {/* Ícone do tipo de transação */}
                <div className={`p-2.5 rounded-full flex-shrink-0 ${
                  transaction.kind === 'income' ? 'bg-green-100 text-green-600' : 
                  transaction.kind === 'expense' ? 'bg-red-100 text-red-600' : 
                  'bg-blue-100 text-blue-600'
                }`}>
                  {transaction.kind === 'income' ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : transaction.kind === 'expense' ? (
                    <ArrowDownIcon className="h-4 w-4" />
                  ) : (
                    <ArrowRightLeftIcon className="h-4 w-4" />
                  )}
                </div>
                
                {/* Conteúdo principal */}
                <div className="flex-1 min-w-0">
                  {/* Descrição em uma linha */}
                  <div className="flex items-center gap-2 mb-1">
                    {transaction.categories?.emoji && (
                      <span className="text-sm flex-shrink-0">{transaction.categories.emoji}</span>
                    )}
                    <p className="font-medium text-sm truncate">{transaction.title}</p>
                  </div>
                  
                  {/* Data, status e valor na mesma linha */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                      {/* Badge apenas em telas maiores que mobile */}
                      <Badge variant={getStatusBadge(transaction.status).variant} className="text-xs hidden sm:inline-flex">
                        {getStatusBadge(transaction.status).label}
                      </Badge>
                    </div>
                    
                    {/* Valor */}
                    <p className={`font-bold text-sm ${
                      transaction.kind === 'income' ? 'text-green-600' : 
                      transaction.kind === 'expense' ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {transaction.kind === 'income' ? '+' : 
                       transaction.kind === 'expense' ? '-' : 
                       '↔'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  
                  {/* Categoria */}
                  {transaction.categories && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {transaction.categories.name}
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