import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateFilter } from "@/components/ui/date-filter";
import { SortableHeader } from "@/components/ui/sortable-header";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useTenant } from "@/hooks/useTenant";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { CategoryExpenseChart } from "@/components/dashboard/CategoryExpenseChart";
import { MovimentacoesCalendar } from "@/components/dashboard/MovimentacoesCalendar";
import { formatDateForDisplay } from "@/utils/dateUtils";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  title: string;
  note: string;
  category_id: string;
  kind: 'income' | 'expense';
  status: 'pending' | 'settled';
  payment_method: string;
}

interface Stats {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  saldoBancos: number;
  saldoMesPassado: number;
  isProjection: boolean; // Indica se os valores são projeções futuras
  isMaximum: boolean; // Indica se o filtro é "Máximo" (todos os dados históricos)
}

const Movimentacoes = () => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    saldoBancos: 0,
    saldoMesPassado: 0,
    isProjection: false,
    isMaximum: false,
  });
  const [loading, setLoading] = useState(true);
  const getCurrentMonthRange = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from, to };
  };

  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(getCurrentMonthRange());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [kindFilter, setKindFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  useEffect(() => {
    if (user && tenantId) {
      loadData();
    }
  }, [user, tenantId, dateFilter]);

  const toDateStr = (d: Date) => {
    const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Verificar se o período inclui datas futuras
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const filterMonth = dateFilter?.to?.getMonth();
      const filterYear = dateFilter?.to?.getFullYear();
      
      // É projeção futura apenas se for um mês/ano realmente futuro
      const isProjection = dateFilter && dateFilter.to && 
        (filterYear > currentYear || (filterYear === currentYear && filterMonth > currentMonth));
      
      // Debug da detecção de projeção
      console.log('=== DETECÇÃO DE PROJEÇÃO ===');
      console.log('Data de hoje:', today.toLocaleDateString('pt-BR'));
      console.log('Data de hoje (ISO):', today.toISOString());
      console.log('Data filtro "to":', dateFilter?.to?.toLocaleDateString('pt-BR'));
      console.log('Data filtro "to" (ISO):', dateFilter?.to?.toISOString());
      console.log('É projeção futura:', isProjection);
      console.log('Comparação:', dateFilter?.to, '>', today, '=', dateFilter?.to && dateFilter.to > today);
      
      // Verificar se estamos no mesmo mês
      console.log('Mês atual:', currentMonth + 1, 'Ano atual:', currentYear);
      console.log('Mês filtro:', (filterMonth || 0) + 1, 'Ano filtro:', filterYear);
      console.log('É o mesmo mês:', currentMonth === filterMonth && currentYear === filterYear);
      
      // Verificar se é o filtro "Máximo" (desde 2020 até hoje)
      const isMaximum = dateFilter && 
        dateFilter.from && 
        dateFilter.from.getFullYear() === 2020 && 
        dateFilter.from.getMonth() === 0 && 
        dateFilter.from.getDate() === 1 &&
        dateFilter.to && 
        dateFilter.to <= today;
      
      // Lista de movimentações: sempre apenas transações liquidadas (settled)
      let transactionQuery = supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'settled');

      console.log('[MOVIMENTACOES] Lista: apenas transações liquidadas (settled)');

      // Queries para resumos financeiros (podem incluir projeções futuras)
      let incomeQuery = supabase
        .from('transactions')
        .select('amount, status')
        .eq('kind', 'income')
        .eq('tenant_id', tenantId);

      let expenseQuery = supabase
        .from('transactions')
        .select('amount, status')
        .eq('kind', 'expense')
        .eq('tenant_id', tenantId)
        .neq('payment_method', 'credit_card');

      // Para totais do período: incluir pending apenas se for período futuro
      if (isProjection) {
        // Para projeções futuras, consideramos tanto 'settled' quanto 'pending' nos totais
        console.log('[MOVIMENTACOES] Calculando projeção futura - incluindo transações pending nos totais');
      } else {
        // Para períodos passados/atuais, apenas 'settled' nos totais
        incomeQuery = incomeQuery.eq('status', 'settled');
        expenseQuery = expenseQuery.eq('status', 'settled');
      }
      
      // Apply date filter (native behavior: current month by default)
      if (dateFilter && dateFilter.from && dateFilter.to) {
        const startDate = toDateStr(dateFilter.from);
        const endDate = toDateStr(dateFilter.to);
        
        transactionQuery = transactionQuery
          .gte('date', startDate)
          .lte('date', endDate);
        
        incomeQuery = incomeQuery
          .gte('date', startDate)
          .lte('date', endDate);
        
        expenseQuery = expenseQuery
          .gte('date', startDate)
          .lte('date', endDate);
      }

      const [transactionsResult, incomeResult, expenseResult] = await Promise.all([
        transactionQuery.order('date', { ascending: false }),
        incomeQuery,
        expenseQuery
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;

      setTransactions((transactionsResult.data || []) as Transaction[]);

      // Calcular totais considerando o tipo de período
      let totalReceitas = 0;
      let totalDespesas = 0;

      if (isProjection) {
        // Para projeções futuras, somar todas as transações (settled + pending)
        totalReceitas = (incomeResult.data || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        totalDespesas = (expenseResult.data || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        console.log('[MOVIMENTACOES] Totais incluem projeções futuras (settled + pending)');
      } else {
        // Para períodos passados/atuais, apenas transações settled
        totalReceitas = (incomeResult.data || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        totalDespesas = (expenseResult.data || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        console.log('[MOVIMENTACOES] Totais apenas transações praticadas (settled)');
      }
      
      // Calculate cumulative balance including initial bank balance
      const { data: banksData } = await supabase
        .from('banks')
        .select('balance');

      // Calculate cumulative balance: initial bank balance + all historical transactions until end of period
      // Para resumos financeiros, pode incluir projeções futuras se necessário
      const endDate = dateFilter && dateFilter.to ? toDateStr(dateFilter.to) : toDateStr(new Date());
      const { data: allTransactionsUntilNow } = await supabase
        .from('transactions')
        .select('amount, kind, status, date, payment_method')
        .eq('tenant_id', tenantId)
        .lte('date', endDate)
        .order('date', { ascending: true });

      // Calculate cumulative balance: initial bank balance + all historical transactions (excluding credit card expenses)
      const totalInitialBankBalance = banksData?.reduce((sum, bank) => sum + Number(bank.balance || 0), 0) || 0;
      let cumulativeBalance = totalInitialBankBalance;
      
      if (allTransactionsUntilNow) {
        let settledCount = 0;
        let pendingCount = 0;
        
        allTransactionsUntilNow.forEach(transaction => {
          // Cálculo do saldo:
          // - Para períodos atuais/passados: apenas transações praticadas (settled)
          // - Para períodos futuros: incluir projeções (settled + pending)
          if (isProjection) {
            // Período futuro: incluir todas as transações (settled + pending) no saldo
            if (transaction.kind === 'income') {
              cumulativeBalance += Number(transaction.amount);
            } else if (transaction.kind === 'expense' && transaction.payment_method !== 'credit_card') {
              cumulativeBalance -= Number(transaction.amount);
            }
            if (transaction.status === 'settled') settledCount++;
            else pendingCount++;
          } else {
            // Período atual/passado: apenas transações praticadas (settled) no saldo
            if (transaction.status === 'settled') {
              if (transaction.kind === 'income') {
                cumulativeBalance += Number(transaction.amount);
              } else if (transaction.kind === 'expense' && transaction.payment_method !== 'credit_card') {
                cumulativeBalance -= Number(transaction.amount);
              }
              settledCount++;
            } else {
              pendingCount++;
            }
          }
        });
        
        console.log('=== CONTAGEM DE TRANSAÇÕES ===');
        console.log('Transações settled incluídas:', settledCount);
        console.log('Transações pending:', pendingCount);
        console.log('Total de transações:', allTransactionsUntilNow.length);
      }

      // Debug logs detalhados
      console.log('[MOVIMENTACOES DEBUG]', {
        period: dateFilter ? `${dateFilter.from?.toLocaleDateString('pt-BR')} - ${dateFilter.to?.toLocaleDateString('pt-BR')}` : 'current month',
        isProjection,
        isMaximum,
        totalReceitas,
        totalDespesas,
        totalInitialBankBalance,
        cumulativeBalance,
        transactionsCount: allTransactionsUntilNow?.length || 0
      });

      // Logs expandidos para debug
      console.log('=== MOVIMENTACOES DEBUG EXPANDIDO ===');
      console.log('Período:', dateFilter ? `${dateFilter.from?.toLocaleDateString('pt-BR')} - ${dateFilter.to?.toLocaleDateString('pt-BR')}` : 'current month');
      console.log('É projeção futura:', isProjection);
      console.log('É filtro máximo:', isMaximum);
      console.log('Total Receitas:', totalReceitas);
      console.log('Total Despesas:', totalDespesas);
      console.log('Saldo Inicial Bancos:', totalInitialBankBalance);
      console.log('Saldo Final Calculado:', cumulativeBalance);
      console.log('Quantidade de Transações:', allTransactionsUntilNow?.length || 0);

      // Debug detalhado das transações
      if (allTransactionsUntilNow) {
        console.log('[MOVIMENTACOES TRANSACTIONS DEBUG]', {
          totalTransactions: allTransactionsUntilNow.length,
          transactions: allTransactionsUntilNow.map(t => ({
            date: t.date,
            kind: t.kind,
            amount: t.amount,
            status: t.status,
            payment_method: t.payment_method,
            isSettled: t.status === 'settled',
            isCreditCard: t.payment_method === 'credit_card'
          }))
        });

        // Calcular totais separadamente para debug
        let debugIncome = 0;
        let debugExpense = 0;
        let debugCreditCardExpense = 0;
        
        allTransactionsUntilNow.forEach(transaction => {
          if (transaction.status === 'settled') {
            if (transaction.kind === 'income') {
              debugIncome += Number(transaction.amount);
            } else if (transaction.kind === 'expense') {
              if (transaction.payment_method === 'credit_card') {
                debugCreditCardExpense += Number(transaction.amount);
              } else {
                debugExpense += Number(transaction.amount);
              }
            }
          }
        });

        console.log('[MOVIMENTACOES CALCULATION DEBUG]', {
          debugIncome,
          debugExpense,
          debugCreditCardExpense,
          totalInitialBankBalance,
          calculatedBalance: totalInitialBankBalance + debugIncome - debugExpense,
          finalCumulativeBalance: cumulativeBalance
        });

        // Logs expandidos para cálculo
        console.log('=== CÁLCULO DETALHADO ===');
        console.log('Receitas (settled):', debugIncome);
        console.log('Despesas normais (settled):', debugExpense);
        console.log('Despesas cartão (settled):', debugCreditCardExpense);
        console.log('Saldo inicial bancos:', totalInitialBankBalance);
        console.log('Saldo calculado (inicial + receitas - despesas):', totalInitialBankBalance + debugIncome - debugExpense);
        console.log('Saldo final (cumulativeBalance):', cumulativeBalance);
        console.log('Diferença:', cumulativeBalance - (totalInitialBankBalance + debugIncome - debugExpense));
      }

      // Calculate previous month's balance based on current period
      let saldoMesPassado = 0;
      if (dateFilter && dateFilter.from) {
        const prevMonthEndDate = new Date(dateFilter.from);
        prevMonthEndDate.setDate(0); // Last day of previous month
        const prevMonthEndDateStr = toDateStr(prevMonthEndDate);

        const { data: prevMonthTransactions } = await supabase
          .from('transactions')
          .select('amount, kind, status, payment_method')
          .eq('tenant_id', tenantId)
          .lte('date', prevMonthEndDateStr)
          .order('date', { ascending: true });

        let prevMonthBalance = totalInitialBankBalance;
        if (prevMonthTransactions) {
          prevMonthTransactions.forEach(transaction => {
            if (transaction.status === 'settled') {
              if (transaction.kind === 'income') {
                prevMonthBalance += Number(transaction.amount);
              } else if (transaction.kind === 'expense' && transaction.payment_method !== 'credit_card') {
                prevMonthBalance -= Number(transaction.amount);
              }
            }
          });
        }
        saldoMesPassado = prevMonthBalance;
      }

      setStats({
        totalReceitas,
        totalDespesas,
        saldo: cumulativeBalance,
        saldoBancos: totalInitialBankBalance,
        saldoMesPassado,
        isProjection,
        isMaximum,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString);
  };

  const getPeriodTitle = () => {
    if (dateFilter && dateFilter.from && dateFilter.to) {
      return `Período: ${dateFilter.from.toLocaleDateString('pt-BR')} - ${dateFilter.to.toLocaleDateString('pt-BR')}`;
    }
    return "Mês Atual";
  };

  const getStatusBadge = (status: string) => {
    return status === 'settled' ? (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        Pago
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        Pendente
      </Badge>
    );
  };

  const getKindBadge = (kind: string) => {
    return kind === 'income' ? (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        Receita
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        Despesa
      </Badge>
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFilteredAndSortedTransactions = () => {
    // Apply kind filter first
    const filtered = kindFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.kind === kindFilter);

    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'kind':
          aValue = a.kind;
          bValue = b.kind;
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Movimentações</h2>
        <p className="text-muted-foreground">
          Centralize todas as suas transações financeiras
        </p>
      </div>

      {/* Resumo Financeiro */}
      <FinancialSummary 
        totalReceitas={stats.totalReceitas}
        totalDespesas={stats.totalDespesas}
        saldo={stats.saldo}
        saldoBancos={stats.saldoBancos}
        saldoMesPassado={stats.saldoMesPassado}
        loading={loading}
        isProjection={stats.isProjection}
        isMaximum={stats.isMaximum}
      />

      {/* Gráfico Combinado de Evolução */}
      <Suspense fallback={<div className="animate-pulse bg-muted h-80 rounded" />}>
        <MonthlyChart title="Evolução das Receitas e Despesas ao Longo do Ano" />
      </Suspense>

      {/* Gráfico de Distribuição por Categoria */}
      <CategoryExpenseChart dateFilter={dateFilter} />

      {/* Lista de Movimentações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Todas as Movimentações - {getPeriodTitle()}</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                {kindFilter === 'all' ? transactions.length : transactions.filter(t => t.kind === kindFilter).length} transações no período
              </div>
            </div>
            <div className="flex gap-2 sm:items-center sm:justify-end">
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as 'all' | 'income' | 'expense' | 'transfer')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                  <SelectItem value="transfer">Transferências</SelectItem>
                </SelectContent>
              </Select>
            <DateFilter 
              onFilterChange={setDateFilter}
              className="sm:max-w-md"
            />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader 
                      label="Data"
                      sortKey="date"
                      currentSort={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader 
                      label="Descrição"
                      sortKey="title"
                      currentSort={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader 
                      label="Tipo"
                      sortKey="kind"
                      currentSort={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader 
                      label="Valor"
                      sortKey="amount"
                      currentSort={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader 
                      label="Status"
                      sortKey="status"
                      currentSort={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredAndSortedTransactions().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação encontrada para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  getFilteredAndSortedTransactions().map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>{transaction.title}</TableCell>
                      <TableCell>
                        {getKindBadge(transaction.kind)}
                      </TableCell>
                      <TableCell className={`font-bold ${
                        transaction.kind === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.kind === 'income' ? '+' : '-'}R$ {transaction.amount.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Calendário de Movimentações */}
      <MovimentacoesCalendar />
    </div>
  );
};

export default Movimentacoes;