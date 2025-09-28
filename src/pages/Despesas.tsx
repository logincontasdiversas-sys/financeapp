import { useState, useEffect, Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Calendar, Info, ArrowRightLeftIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Lottie from "lottie-react";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { logger } from "@/utils/logger";
import { formatDateForDisplay, dateInputToISO, formatDateForMobile } from "@/utils/dateUtils";
import { SortableHeader } from "@/components/ui/sortable-header";
import { ImportCSV } from '@/components/ImportCSV';
import { clearQueryCache } from "@/hooks/useSupabaseQuery";
import { CategorySelect } from '@/components/ui/category-select';
import { InlineEditText, InlineEditNumber, InlineEditDate, InlineEditSelect } from "@/components/ui/inline-edit";
import { createTransferCategory } from "@/utils/createTransferCategory";

import { DespesasSummaryWithDateSync } from "@/components/dashboard/DespesasSummaryWithDateSync";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { SingleLineChart } from "@/components/dashboard/SingleLineChart";

const DespesasCalendar = lazy(() => import("@/components/dashboard/DespesasCalendar"));

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  category_id: string | null;
  bank_id: string | null;
  card_id: string | null;
  status: string;
  note: string | null;
  payment_method: string | null;
  categories?: {
    name: string;
    emoji: string;
  };
  banks?: {
    name: string;
  };
  credit_cards?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface Bank {
  id: string;
  name: string;
}

interface CreditCard {
  id: string;
  name: string;
}

interface Goal {
  id: string;
  title: string;
  current_amount: number;
  target_amount: number;
  category_id: string;
  special_category_id?: string;
}

interface Debt {
  id: string;
  title: string;
  paid_amount: number;
  total_amount: number;
  category_id: string;
  special_category_id?: string;
}

const Despesas = () => {
  const { user } = useStableAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { sendTestNotification } = usePushNotifications();
  const { 
    createExpense, 
    updateExpense, 
    fetchCategories, 
    validateMonthYear,
    isInvoiceCategory,
    getValidMonthYearOptions 
  } = useSupabaseExpenses();
  
  const [despesas, setDespesas] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoiceCategories, setInvoiceCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Transaction | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [lastSelectAll, setLastSelectAll] = useState(false);
  const [showInvoiceField, setShowInvoiceField] = useState(false);
  const [showCardField, setShowCardField] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sharedDateFilter, setSharedDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);
  const [textFilter, setTextFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'normal' | 'credit_card'>('all');

  // Recorrência (repetir em outros meses)
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [monthsDialogOpen, setMonthsDialogOpen] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState<string[]>([]); // YYYY-MM
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Transferência entre bancos
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferToBankId, setTransferToBankId] = useState<string>("");
  const [transferCategoryId, setTransferCategoryId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: "",
    category_id: "",
    bank_id: "",
    card_id: "",
    status: "settled",
    payment_method: "",
    note: "",
    invoice_month_year: "", // Campo MM-AA
  });

  // Realtime sync para transações
  useRealtimeSync({
    table: 'transactions',
    debounceMs: 300,
    onInsert: () => {
      logger.info('DESPESAS_REALTIME', 'INSERT em transactions');
      clearQueryCache();
      loadDespesas();
      setSummaryRefreshKey(k => k + 1);
    },
    onUpdate: () => {
      logger.info('DESPESAS_REALTIME', 'UPDATE em transactions');
      clearQueryCache();
      loadDespesas();
      setSummaryRefreshKey(k => k + 1);
    },
    onDelete: () => {
      logger.info('DESPESAS_REALTIME', 'DELETE em transactions');
      clearQueryCache();
      loadDespesas();
      setSummaryRefreshKey(k => k + 1);
    },
  });

  // Realtime sync para categorias
  useRealtimeSync({
    table: 'categories',
    debounceMs: 300,
    onInsert: () => {
      logger.info('DESPESAS_REALTIME', 'Categoria criada - recarregando despesas');
      loadCategories();
      loadDespesas();
    },
    onUpdate: (payload) => {
      logger.info('DESPESAS_REALTIME', 'Categoria atualizada detectada - recarregando despesas', {
        categoryId: payload?.new?.id,
        name: payload?.new?.name,
      });
      clearQueryCache();
      setTimeout(() => {
        loadCategories();
        loadDespesas();
      }, 100);
    },
    onDelete: () => {
      logger.info('DESPESAS_REALTIME', 'Categoria removida - recarregando despesas');
      loadCategories();
      loadDespesas();
    },
  });

  useEffect(() => {
    if (user && tenantId) {
      loadDespesas();
      loadCategories();
      loadBanks();
      loadCreditCards();
      loadGoals();
      loadDebts();
      createTransferCategoryIfNeeded();
    }
  }, [user, tenantId]);

  const createTransferCategoryIfNeeded = async () => {
    if (!tenantId) return;
    
    try {
      const categoryId = await createTransferCategory(tenantId);
      setTransferCategoryId(categoryId);
    } catch (error) {
      console.error('Erro ao criar categoria de transferência:', error);
    }
  };

  // Monitorar mudança de categoria para mostrar/ocultar campo MM-AA
  useEffect(() => {
    const selectedCategory = categories.find(c => c.id === formData.category_id);
    const shouldShowInvoiceField = selectedCategory && isInvoiceCategory(selectedCategory.id);
    
    if (shouldShowInvoiceField) {
      logger.debug('DESPESAS_INVOICE', 'Campo MM-AA ativado para categoria de fatura', {
        categoryName: selectedCategory?.name
      });
    }
    
    setShowInvoiceField(!!shouldShowInvoiceField);
  }, [formData.category_id, categories, isInvoiceCategory]);

  // Monitorar mudança de método de pagamento para mostrar/ocultar campo de cartão
  useEffect(() => {
    const shouldShowCardField = formData.payment_method === 'credit_card';
    setShowCardField(shouldShowCardField);
    
    // Limpar card_id se não for cartão de crédito
    if (!shouldShowCardField && formData.card_id) {
      setFormData(prev => ({ ...prev, card_id: "" }));
    }
    
    // Limpar bank_id se for cartão de crédito
    if (shouldShowCardField && formData.bank_id) {
      setFormData(prev => ({ ...prev, bank_id: "" }));
    }
  }, [formData.payment_method]);

  const loadDespesas = async () => {
    if (!tenantId) return;
    
    try {
      console.log('[DEBUG] Iniciando carregamento de despesas...');
      logger.info('DESPESAS_LOAD', 'Iniciando carregamento de despesas', { tenantId });
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          category_id,
          bank_id,
          card_id,
          status,
          payment_method,
          note,
          categories:category_id (
            name,
            emoji
          )
        `)
        .eq('kind', 'expense')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) {
        console.error('[DEBUG] Erro na query de despesas:', error);
        throw error;
      }
      
      console.log('[DEBUG] Despesas carregadas com sucesso:', data?.length || 0, 'itens');
      logger.info('DESPESAS_LOAD', 'Despesas carregadas com sucesso', { 
        count: data?.length || 0,
        firstItems: data?.slice(0, 3).map(d => ({ 
          id: d.id, 
          title: d.title, 
          category: d.categories?.name 
        })) || []
      });
      
      setDespesas(data || []);
    } catch (error) {
      console.error('[DEBUG] Erro completo ao carregar despesas:', error);
      logger.error('DESPESAS_LOAD', 'Erro ao carregar despesas', { error });
      console.error('[DESPESAS] Error loading:', error);
      toast({
        title: "Erro ao carregar despesas",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('archived', false)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('[DESPESAS] Error loading categories:', error);
    }
  };

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('[DESPESAS] Error loading banks:', error);
    }
  };

  const loadCreditCards = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('name');

      if (error) throw error;
      setCreditCards(data || []);
    } catch (error) {
      console.error('[DESPESAS] Error loading credit cards:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('id, title, current_amount, target_amount, category_id, special_category_id')
        .eq('completed', false)
        .order('title');

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('[DESPESAS] Error loading goals:', error);
    }
  };

  const loadDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('id, title, paid_amount, total_amount, category_id, special_category_id')
        .eq('settled', false)
        .order('title');

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error('[DESPESAS] Error loading debts:', error);
    }
  };

  // Função principal refatorada
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      // Processar dados do formulário
      const processedFormData = await processFormData(formData);
      
      // Executar operação principal
      if (editingDespesa) {
        await updateTransaction(editingDespesa.id, processedFormData);
      } else if (isTransfer && transferToBankId && transferCategoryId) {
        await createTransfer(processedFormData);
      } else {
        await createExpenseTransaction(processedFormData);
      }

      // Recarregar dados e limpar formulário
      await reloadData();
      resetFormAndClose();

    } catch (error: any) {
      console.error('[DESPESAS] Error saving:', error);
      toast({
        title: "Erro ao salvar despesa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função auxiliar para processar dados do formulário
  const processFormData = async (formData: any) => {
    const processedFormData = { ...formData };
    
    if (formData.category_id.startsWith('goal-')) {
      return await processGoalData(formData, processedFormData);
    } else if (formData.category_id.startsWith('debt-')) {
      return await processDebtData(formData, processedFormData);
    } else {
      // Categoria normal - usar diretamente
      processedFormData.category_id = formData.category_id;
      return processedFormData;
    }
  };

  // Processar dados de meta
  const processGoalData = async (formData: any, processedFormData: any) => {
    const goalId = formData.category_id.replace('goal-', '');
    const selectedGoal = goals.find(g => g.id === goalId);
    
    if (selectedGoal) {
      processedFormData.category_id = selectedGoal.category_id;
      (processedFormData as any).goal_id = goalId;
      
      // Atualizar meta se status for settled
      if (formData.status === 'settled') {
        const newAmount = selectedGoal.current_amount + parseFloat(formData.amount);
        const isGoalAchieved = newAmount >= selectedGoal.target_amount;
        
        await supabase
          .from('goals')
          .update({ 
            current_amount: newAmount,
            is_concluded: isGoalAchieved
          })
          .eq('id', goalId);
      }
    }
    
    return processedFormData;
  };

  // Processar dados de dívida
  const processDebtData = async (formData: any, processedFormData: any) => {
    const debtId = formData.category_id.replace('debt-', '');
    const selectedDebt = debts.find(d => d.id === debtId);
    
    if (selectedDebt) {
      // FILTRO CRÍTICO: Usar special_category_id para pagamentos específicos da dívida
      // Isso garante que apenas transações da subcategoria personalizada sejam contabilizadas
      processedFormData.category_id = selectedDebt.special_category_id || selectedDebt.category_id;
      (processedFormData as any).debt_id = debtId;
      
      console.log('[DESPESAS] Processando dívida:', {
        debtId,
        debtTitle: selectedDebt.title,
        categoryId: selectedDebt.category_id,
        specialCategoryId: selectedDebt.special_category_id,
        finalCategoryId: processedFormData.category_id
      });
    }
    
    return processedFormData;
  };

  // Atualizar transação existente
  const updateTransaction = async (id: string, processedFormData: any) => {
    // IMPORTANTE: Se estamos editando um pagamento de dívida, preservar a categoria especial
    if (editingDespesa && (editingDespesa as any).debt_id) {
      console.log('[DESPESAS] Editando pagamento de dívida - preservando categoria especial');
      processedFormData.category_id = editingDespesa.category_id; // Manter a categoria especial
      (processedFormData as any).debt_id = (editingDespesa as any).debt_id; // Manter o debt_id
    }
    
    await updateExpense(id, processedFormData);
    
    // Recálculo de dívida se necessário
    if (processedFormData.debt_id) {
      await recalculateDebt(processedFormData.debt_id);
    }
  };

  // Criar transferência
  const createTransfer = async (processedFormData: any) => {
    const amount = parseFloat(processedFormData.amount);
    const fromBank = banks.find(b => b.id === processedFormData.bank_id);
    const toBank = banks.find(b => b.id === transferToBankId);
    
    if (!fromBank || !toBank) {
      throw new Error("Bancos não encontrados.");
    }

    const transactions = [
      {
        title: processedFormData.title,
        amount: amount,
        date: processedFormData.date,
        category_id: transferCategoryId,
        bank_id: processedFormData.bank_id,
        kind: 'expense',
        status: 'settled',
        payment_method: processedFormData.payment_method === 'transfer_pix' ? 'PIX' : 'DOC/TED',
        note: `Transferência para ${toBank.name}${processedFormData.note ? ` - ${processedFormData.note}` : ''}`,
        user_id: user.id,
        tenant_id: tenantId,
      },
      {
        title: processedFormData.title,
        amount: amount,
        date: processedFormData.date,
        category_id: transferCategoryId,
        bank_id: transferToBankId,
        kind: 'income',
        status: 'settled',
        payment_method: processedFormData.payment_method === 'transfer_pix' ? 'PIX' : 'DOC/TED',
        note: `Transferência de ${fromBank.name}${processedFormData.note ? ` - ${processedFormData.note}` : ''}`,
        user_id: user.id,
        tenant_id: tenantId,
      }
    ];

    const { error } = await supabase
      .from('transactions')
      .insert(transactions);

    if (error) throw error;

    toast({
      title: "Transferência realizada!",
      description: `R$ ${amount.toFixed(2)} transferido de ${fromBank.name} para ${toBank.name}.`,
    });
  };

  // Criar despesa
  const createExpenseTransaction = async (processedFormData: any) => {
    const created = await createExpense(processedFormData);
    
    // Recálculo de dívida se necessário
    if (processedFormData.debt_id) {
      await recalculateDebt(processedFormData.debt_id);
    }
    
    // Processar repetições se habilitado
    if (repeatEnabled && repeatMonths.length > 0) {
      await createRepeatedTransactions(processedFormData);
    }
    
    return created;
  };

  // Recarregar todos os dados
  const reloadData = async () => {
    await loadDespesas();
    await loadGoals();
    await loadDebts();
    setSummaryRefreshKey((k) => k + 1);
  };

  // Limpar formulário e fechar diálogo
  const resetFormAndClose = () => {
    setIsDialogOpen(false);
    setEditingDespesa(null);
    resetForm();
    setRepeatEnabled(false);
    setRepeatMonths([]);
  };

  // Recálculo de dívida
  const recalculateDebt = async (debtId: string) => {
    // Buscar dados da dívida para obter special_category_id
    const { data: debtData, error: debtError } = await supabase
      .from('debts')
      .select('special_category_id')
      .eq('id', debtId)
      .single();

    if (debtError || !debtData?.special_category_id) {
      console.error('[DESPESAS] Erro ao buscar dados da dívida:', debtError);
      return;
    }

    // Filtrar apenas transações com category_id igual ao special_category_id da dívida
    const { data: settledTransactions, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('kind', 'expense')
      .eq('debt_id', debtId)
      .eq('category_id', debtData.special_category_id) // FILTRO CRÍTICO: apenas subcategoria específica
      .eq('status', 'settled');

    if (error) {
      console.error('[DESPESAS] Erro ao buscar transações da dívida:', error);
      return;
    }

    const newPaidAmount = settledTransactions?.reduce((sum, transaction) => {
      return sum + Number(transaction.amount || 0);
    }, 0) || 0;

    const debt = debts.find(d => d.id === debtId);
    const isFullyPaid = debt?.total_amount ? newPaidAmount >= debt.total_amount : false;

    console.log('[DESPESAS] Recálculo de dívida:', {
      debtId,
      specialCategoryId: debtData.special_category_id,
      transactionsCount: settledTransactions?.length || 0,
      newPaidAmount,
      isFullyPaid
    });

    await supabase
      .from('debts')
      .update({ 
        paid_amount: newPaidAmount,
        is_concluded: isFullyPaid
      })
      .eq('id', debtId);

    setDebts(prevDebts => 
      prevDebts.map(d => 
        d.id === debtId 
          ? { ...d, paid_amount: newPaidAmount, is_concluded: isFullyPaid }
          : d
      )
    );
  };

  // Criar transações repetidas
  const createRepeatedTransactions = async (processedFormData: any) => {
    const base = new Date(processedFormData.date + 'T00:00:00');
    const day = base.getDate();
    
    const makeSafeDate = (year: number, monthIndex: number, dayOfMonth: number) => {
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const safeDay = Math.min(dayOfMonth, lastDay);
      const d = new Date(year, monthIndex, safeDay);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    const baseKey = base.getFullYear() * 100 + (base.getMonth() + 1);
    const extraRows = repeatMonths
      .filter((ym) => {
        const [yStr, mStr] = ym.split('-');
        const key = parseInt(yStr, 10) * 100 + parseInt(mStr, 10);
        return key > baseKey;
      })
      .map((ym) => {
        const [yStr, mStr] = ym.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        const { invoice_month_year, ...transactionData } = processedFormData;
        
        const normalizeOptionalUUID = (value?: string | null) => {
          if (value === undefined || value === null) return null;
          const trimmed = String(value).trim();
          if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return null;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(trimmed) ? trimmed : null;
        };
        
        return {
          title: transactionData.title,
          amount: parseFloat(transactionData.amount),
          date: makeSafeDate(y, m, day),
          category_id: normalizeOptionalUUID(transactionData.category_id),
          bank_id: normalizeOptionalUUID(transactionData.bank_id),
          card_id: normalizeOptionalUUID(transactionData.card_id),
          status: 'pending',
          payment_method: transactionData.payment_method || null,
          note: transactionData.note || null,
          kind: 'expense',
          user_id: user.id,
          tenant_id: tenantId,
        };
      });

    if (extraRows.length > 0) {
      const { data: insertedRows, error: bulkErr } = await supabase
        .from('transactions')
        .insert(extraRows)
        .select();
        
      if (bulkErr) throw bulkErr;
      
      if (insertedRows && insertedRows.length > 0) {
        setDespesas(prev => [
          ...insertedRows.map((t: any) => ({
            id: t.id,
            title: t.title,
            amount: Number(t.amount),
            date: t.date,
            category_id: t.category_id,
            bank_id: t.bank_id,
            card_id: t.card_id,
            status: t.status,
            payment_method: t.payment_method,
            note: t.note,
          } as unknown as Transaction)),
          ...prev,
        ]);
      }
    }
  };

  // Resto das funções auxiliares...
  const resetForm = () => {
    setFormData({
      title: "",
      amount: "",
      date: "",
      category_id: "",
      bank_id: "",
      card_id: "",
      status: "settled",
      payment_method: "",
      note: "",
      invoice_month_year: "",
    });
  };

  const handleEdit = (despesa: Transaction) => {
    setEditingDespesa(despesa);
    
    // Determinar a categoria correta para exibição
    let displayCategoryId = despesa.category_id || "";
    
    // Se a despesa tem debt_id, usar o formato debt-{id}
    if ((despesa as any).debt_id) {
      displayCategoryId = `debt-${(despesa as any).debt_id}`;
    }
    // Se a despesa tem goal_id, usar o formato goal-{id}
    else if ((despesa as any).goal_id) {
      displayCategoryId = `goal-${(despesa as any).goal_id}`;
    }
    // Se não tem debt_id nem goal_id, usar a categoria original
    else {
      displayCategoryId = despesa.category_id || "";
    }
    
    // Se a categoria está vazia, tentar encontrar a categoria pai
    if (!displayCategoryId && despesa.categories) {
      // Buscar a categoria pelo nome nas categorias disponíveis
      const matchingCategory = categories.find(cat => cat.name === despesa.categories?.name);
      if (matchingCategory) {
        displayCategoryId = matchingCategory.id;
        console.log('[DESPESAS] Usando categoria pai encontrada:', matchingCategory);
      }
    }
    
    // IMPORTANTE: Se é pagamento de dívida, usar a categoria pai para exibição
    if ((despesa as any).debt_id) {
      // Para pagamentos de dívida, usar o formato debt-{id} para exibição
      displayCategoryId = `debt-${(despesa as any).debt_id}`;
      console.log('[DESPESAS] Usando categoria de dívida para exibição:', displayCategoryId);
    }
    
    console.log('[DESPESAS] Editando despesa:', {
      id: despesa.id,
      title: despesa.title,
      originalCategoryId: despesa.category_id,
      debtId: (despesa as any).debt_id,
      goalId: (despesa as any).goal_id,
      displayCategoryId,
      categories: despesa.categories
    });
    
    const newFormData = {
      title: despesa.title,
      amount: despesa.amount.toString(),
      date: despesa.date,
      category_id: displayCategoryId,
      bank_id: despesa.bank_id || "",
      card_id: despesa.card_id || "",
      status: despesa.status,
      payment_method: despesa.payment_method || "",
      note: despesa.note || "",
      invoice_month_year: "",
    };
    
    console.log('[DESPESAS] FormData definido:', newFormData);
    setFormData(newFormData);
    setIsDialogOpen(true);
  };

  // Funções auxiliares para edição inline
  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    console.log('[DESPESAS] handleInlineUpdate chamado:', { id, field, value });
    console.log('[DESPESAS] Usuário:', user?.id, 'Tenant:', tenantId);
    
    if (!user || !tenantId) {
      console.log('[DESPESAS] Usuário ou tenant não encontrado');
      return;
    }

    try {
      const transaction = despesas.find(d => d.id === id);
      if (!transaction) {
        console.error('[DESPESAS] Transação não encontrada:', id);
        return;
      }

      // Verificar se é mudança de status em pagamento de dívida
      if (field === 'status') {
        const debtId = (transaction as any).debt_id;
        console.log('[DESPESAS] Verificando dívida:', { debtId, transactionId: id });
        
        if (!debtId) {
          console.log('[DESPESAS] Transação sem debt_id - atualização normal');
          // Atualização normal sem recálculo de dívida
          const updateData: any = {};
          updateData[field] = value;
          
          const { error } = await supabase
            .from('transactions')
            .update(updateData)
            .eq('id', id);

          if (error) throw error;

          setDespesas(prev => 
            prev.map(d => d.id === id ? { ...d, [field]: value } : d)
          );
          
          clearQueryCache();
          loadDespesas();
          setSummaryRefreshKey(k => k + 1);
          return;
        }
        
        const selectedDebt = debts.find(d => d.id === debtId);
        
        if (selectedDebt && selectedDebt.special_category_id) {
          // Verificar se é um pagamento de dívida (categoria correta)
          if (transaction.category_id === selectedDebt.special_category_id) {
            const oldStatus = transaction.status;
            const newStatus = value;
            const amount = transaction.amount;
            
            console.log('[DESPESAS] Mudança de status em pagamento de dívida:', {
              debtId,
              debtTitle: selectedDebt.title,
              oldStatus,
              newStatus,
              amount,
              currentPaidAmount: selectedDebt.paid_amount
            });

            // Confirmação antes de alterar
            const statusChange = `${oldStatus === 'settled' ? 'Pago' : 'Pendente'} → ${newStatus === 'settled' ? 'Pago' : 'Pendente'}`;
            const amountChange = oldStatus === 'settled' && newStatus === 'pending' 
              ? `-R$ ${amount.toFixed(2)}` 
              : oldStatus === 'pending' && newStatus === 'settled' 
                ? `+R$ ${amount.toFixed(2)}` 
                : '0';

            const confirmed = confirm(
              `Alterar status do pagamento da dívida "${selectedDebt.title}"?\n\n` +
              `Status: ${statusChange}\n` +
              `Valor: R$ ${amount.toFixed(2)}\n` +
              `Impacto no saldo: ${amountChange}\n\n` +
              `Saldo atual: R$ ${selectedDebt.paid_amount.toFixed(2)}\n` +
              `Saldo após: R$ ${(selectedDebt.paid_amount + (newStatus === 'settled' ? amount : -amount)).toFixed(2)}`
            );

            if (!confirmed) {
              console.log('[DESPESAS] Alteração cancelada pelo usuário');
              return;
            }

            // Atualizar transação
            const updateData: any = {};
            updateData[field] = value;
            
            const { error: updateError } = await supabase
              .from('transactions')
              .update(updateData)
              .eq('id', id);

            if (updateError) throw updateError;

            // Calcular novo paid_amount com fallbacks
            let newPaidAmount = selectedDebt.paid_amount || 0;
            const transactionAmount = amount || 0;
            
            if (oldStatus === 'settled' && newStatus === 'pending') {
              newPaidAmount = Math.max(0, newPaidAmount - transactionAmount);
            } else if (oldStatus === 'pending' && newStatus === 'settled') {
              newPaidAmount += transactionAmount;
            }
            
            // Garantir que não seja negativo
            newPaidAmount = Math.max(0, newPaidAmount);

            // Verificar se dívida está quitada
            const isFullyPaid = newPaidAmount >= selectedDebt.total_amount;
            const isConcluded = isFullyPaid;

            console.log('[DESPESAS] Atualizando dívida:', {
              debtId,
              oldPaidAmount: selectedDebt.paid_amount,
              newPaidAmount,
              totalAmount: selectedDebt.total_amount,
              isFullyPaid,
              isConcluded
            });

            // Atualizar dívida no Supabase com retry
            let debtUpdateSuccess = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!debtUpdateSuccess && retryCount < maxRetries) {
              try {
                const { error: debtError } = await supabase
                  .from('debts')
                  .update({ 
                    paid_amount: newPaidAmount,
                    is_concluded: isConcluded
                  })
                  .eq('id', debtId);

                if (debtError) {
                  console.error(`[DESPESAS] Erro ao atualizar dívida (tentativa ${retryCount + 1}):`, debtError);
                  retryCount++;
                  if (retryCount >= maxRetries) {
                    throw debtError;
                  }
                  // Aguardar antes de tentar novamente
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                } else {
                  debtUpdateSuccess = true;
                }
              } catch (error) {
                console.error(`[DESPESAS] Erro na tentativa ${retryCount + 1}:`, error);
                retryCount++;
                if (retryCount >= maxRetries) {
                  throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }

            // Atualizar estado local
            setDespesas(prev => 
              prev.map(d => d.id === id ? { ...d, [field]: value } : d)
            );

            setDebts(prevDebts => 
              prevDebts.map(d => 
                d.id === debtId 
                  ? { ...d, paid_amount: newPaidAmount, is_concluded: isConcluded }
                  : d
              )
            );

            // Notificação de sucesso
            toast({
              title: "Status atualizado com sucesso!",
              description: `Dívida "${selectedDebt.title}" - Saldo: R$ ${newPaidAmount.toFixed(2)}${isConcluded ? ' (QUITADA!)' : ''}`,
              variant: "default",
            });

            // Animação de sucesso
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 3000);

            // Notificação push para mudanças importantes
            if (isConcluded) {
              try {
                await sendTestNotification();
                console.log('[DESPESAS] Notificação de dívida quitada enviada');
              } catch (error) {
                console.error('[DESPESAS] Erro ao enviar notificação:', error);
              }
            }

            // Log detalhado
            console.log('[DESPESAS] Atualização concluída:', {
              transactionId: id,
              debtId,
              statusChange,
              amountChange,
              newPaidAmount,
              isConcluded
            });

          } else {
            console.log('[DESPESAS] Transação não é pagamento de dívida - categoria incorreta:', {
              transactionCategoryId: transaction.category_id,
              debtSpecialCategoryId: selectedDebt.special_category_id
            });
            
            // Atualização normal sem recálculo de dívida
            const updateData: any = {};
            updateData[field] = value;
            
            const { error } = await supabase
              .from('transactions')
              .update(updateData)
              .eq('id', id);

            if (error) throw error;

            setDespesas(prev => 
              prev.map(d => d.id === id ? { ...d, [field]: value } : d)
            );
          }
        } else {
          // Fallback para dívidas sem special_category_id
          console.log('[DESPESAS] Dívida sem special_category_id - usando fallback');
          await recalculateDebt(debtId);
        }
      } else {
        // Atualização normal para outros campos
        const updateData: any = {};
        updateData[field] = value;
        
        const { error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        setDespesas(prev => 
          prev.map(d => d.id === id ? { ...d, [field]: value } : d)
        );
      }

      clearQueryCache();
      loadDespesas();
      setSummaryRefreshKey(k => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error updating inline:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDespesas(prev => prev.filter(d => d.id !== id));
      clearQueryCache();
      setSummaryRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error deleting:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = (despesa: Transaction) => {
    setFormData({
      title: `${despesa.title} (cópia)`,
      amount: despesa.amount.toString(),
      date: despesa.date,
      category_id: despesa.category_id || "",
      bank_id: despesa.bank_id || "",
      card_id: despesa.card_id || "",
      status: "pending",
      payment_method: despesa.payment_method || "",
      note: despesa.note || "",
      invoice_month_year: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditSelected = () => {
    if (selectedItems.length === 1) {
      const selectedDespesa = despesas.find(d => d.id === selectedItems[0]);
      if (selectedDespesa) {
        handleEdit(selectedDespesa);
      }
    } else {
      toast({
        title: "Selecione apenas uma despesa para editar",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedItems.length === 1) {
      const selectedDespesa = despesas.find(d => d.id === selectedItems[0]);
      if (selectedDespesa) {
        handleDuplicate(selectedDespesa);
      }
    } else {
      toast({
        title: "Selecione apenas uma despesa para duplicar",
        variant: "destructive"
      });
    }
  };

  const getMonthsOptions = (baseDateStr: string) => {
    if (!baseDateStr) return [];
    
    const baseDate = new Date(baseDateStr + 'T00:00:00');
    const currentMonth = baseDate.getMonth();
    const currentYear = baseDate.getFullYear();
    
    const options = [];
    for (let i = 1; i <= 12; i++) {
      const targetDate = new Date(currentYear, currentMonth + i, 1);
      const value = targetDate.toISOString().slice(0, 7); // YYYY-MM
      const label = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  // Funções de seleção múltipla
  const handleSelectAll = () => {
    if (lastSelectAll) {
      setSelectedItems([]);
      setLastSelectAll(false);
    } else {
      setSelectedItems(despesas.map(d => d.id));
      setLastSelectAll(true);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} despesa(s)?`)) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      setDespesas(prev => prev.filter(d => !selectedItems.includes(d.id)));
      setSelectedItems([]);
      setSelectionMode(false);
      clearQueryCache();
      setSummaryRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Funções de ordenação
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Funções de filtro
  const filteredDespesas = despesas.filter(despesa => {
    const matchesText = textFilter === "" || 
      despesa.title.toLowerCase().includes(textFilter.toLowerCase()) ||
      despesa.categories?.name.toLowerCase().includes(textFilter.toLowerCase());

    const matchesPaymentMethod = paymentMethodFilter === 'all' ||
      (paymentMethodFilter === 'normal' && !despesa.card_id) ||
      (paymentMethodFilter === 'credit_card' && despesa.card_id);

    const matchesDate = !sharedDateFilter || 
      (!sharedDateFilter.from || despesa.date >= sharedDateFilter.from.toISOString().split('T')[0]) &&
      (!sharedDateFilter.to || despesa.date <= sharedDateFilter.to.toISOString().split('T')[0]);

    return matchesText && matchesPaymentMethod && matchesDate;
  });

  // Ordenação
  const sortedDespesas = [...filteredDespesas].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField as keyof Transaction];
    const bValue = b[sortField as keyof Transaction];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando despesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Despesas</h2>
          <p className="text-muted-foreground">
            Gerencie seus gastos e despesas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingDespesa(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDespesa ? "Editar Despesa" : "Nova Despesa"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <CategorySelect
                    value={formData.category_id}
                    onValueChange={(value) => {
                      console.log('[DESPESAS] Categoria selecionada:', value);
                      setFormData({ ...formData, category_id: value });
                    }}
                    categories={categories}
                    onCategoriesChange={setCategories}
                    goals={goals}
                    debts={debts}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="settled">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Método de Pagamento</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transfer_pix">Transferência PIX</SelectItem>
                      <SelectItem value="transfer_doc">Transferência DOC/TED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showCardField && (
                  <div className="space-y-2">
                    <Label htmlFor="card">Cartão</Label>
                    <Select
                      value={formData.card_id}
                      onValueChange={(value) => setFormData({ ...formData, card_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {creditCards.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!showCardField && (
                  <div className="space-y-2">
                    <Label htmlFor="bank">Banco</Label>
                    <Select
                      value={formData.bank_id}
                      onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map(bank => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="note">Observações</Label>
                  <Input
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>

                {/* Recorrência */}
                <div className="space-y-3 border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="repeat"
                      checked={repeatEnabled}
                      onCheckedChange={(c) => {
                        const enabled = Boolean(c);
                        setRepeatEnabled(enabled);
                        if (enabled) setMonthsDialogOpen(true);
                      }}
                    />
                    <Label htmlFor="repeat">Esta despesa se repete em outros meses?</Label>
                    {repeatEnabled && (
                      <Button type="button" variant="secondary" onClick={() => setMonthsDialogOpen(true)}>
                        Selecionar meses
                      </Button>
                    )}
                  </div>
                  {repeatEnabled && repeatMonths.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Meses selecionados: {repeatMonths.join(', ')}
                    </div>
                  )}
                </div>

                {/* Popup de seleção de meses */}
                {monthsDialogOpen && (
                  <div className="border rounded-md p-3 space-y-2">
                    <div className="font-semibold">Selecione os meses:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {getMonthsOptions(formData.date).map(opt => (
                        <Button
                          key={opt.value}
                          type="button"
                          variant={repeatMonths.includes(opt.value) ? 'default' : 'outline'}
                          onClick={() => {
                            setRepeatMonths(prev =>
                              prev.includes(opt.value)
                                ? prev.filter(v => v !== opt.value)
                                : [...prev, opt.value]
                            );
                          }}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setMonthsDialogOpen(false)}>Fechar</Button>
                      <Button type="button" onClick={() => setMonthsDialogOpen(false)}>Confirmar</Button>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full">
                  {editingDespesa ? "Atualizar" : "Criar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seção de Resumo das Despesas */}
      <DespesasSummaryWithDateSync 
        key={summaryRefreshKey}
      />

      {/* Gráfico Mensal de Despesas */}
      <SingleLineChart 
        title="Evolução das Despesas ao Longo do Ano"
        dataType="expense"
        lineColor="hsl(var(--destructive))"
        lineName="Despesas"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Lista de Despesas</CardTitle>
            </div>
            <div className="w-72">
              <Input
                placeholder="Filtrar por título, categoria ou observações..."
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de ações dentro do campo da lista (mobile e desktop) */}
          {selectedItems.length > 0 && (
            <div className="mb-3 px-1 sm:px-0">
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                {lastSelectAll ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="h-8 px-2 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSelected()}
                      className="h-8 px-2 text-xs flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateSelected()}
                      className="h-8 px-2 text-xs flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Duplicar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-8 px-2 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Layout Mobile - Cards */}
          <div className="block sm:hidden space-y-3">
            {/* Barra de seleção - Mobile */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Button
                size="sm"
                onClick={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setLastSelectAll(false);
                  } else {
                    const all = sortedDespesas;
                    setSelectedItems(all.map(d => d.id));
                    setLastSelectAll(true);
                  }
                }}
              >
                {selectionMode ? 'Selecionar Todos' : 'Selecionar'}
              </Button>
              <div className="flex items-center gap-1 flex-wrap">
                {selectionMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => { setSelectionMode(false); setSelectedItems([]); setLastSelectAll(false); }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            {/* Cards das despesas */}
            {sortedDespesas.map((despesa) => (
              <div key={despesa.id} className="bg-muted/50 rounded-lg p-4 relative">
                {selectionMode && (
                  <div className="absolute top-3 right-3">
                    <Checkbox
                      checked={selectedItems.includes(despesa.id)}
                      onCheckedChange={() => handleSelectItem(despesa.id)}
                    />
                  </div>
                )}
                <div className="grid grid-cols-12 gap-1 relative auto-rows-[56px] -ml-[14px]">
                  <div className="col-start-1 col-end-3 flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {despesa.categories?.emoji || '💰'}
                    </div>
                  </div>
                  <div className="col-start-3 col-end-12 flex flex-col justify-center pl-2">
                    <div className="font-medium text-sm">{despesa.title}</div>
                    <div className="text-xs text-muted-foreground">{despesa.categories?.name}</div>
                    <div className="text-xs text-muted-foreground">{despesa.date}</div>
                  </div>
                  <div className="col-start-12 col-end-13 flex items-center justify-center">
                    <div className="text-right">
                      <div className="font-bold text-red-600">R$ {despesa.amount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{despesa.status === 'settled' ? 'Pago' : 'Pendente'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Layout Desktop - Tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === sortedDespesas.length && sortedDespesas.length > 0}
                      onCheckedChange={handleSelectAll}
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
                      label="Categoria"
                      sortKey="category"
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
                      label="Data"
                      sortKey="date"
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
                {sortedDespesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(despesa.id)}
                        onCheckedChange={() => handleSelectItem(despesa.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <InlineEditText
                        value={despesa.title}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'title', value)}
                        placeholder="Título da despesa"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span>{despesa.categories?.emoji}</span>
                        <span>{despesa.categories?.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      <InlineEditNumber
                        value={despesa.amount}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'amount', value)}
                        formatValue={(value) => `R$ ${value.toFixed(2)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditDate
                        value={despesa.date}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'date', value)}
                        formatValue={(date) => formatDateForDisplay(date)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditSelect
                        value={despesa.status}
                        options={[
                          { value: "settled", label: "Pago" },
                          { value: "pending", label: "Pendente" }
                        ]}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'status', value)}
                        getDisplayValue={(value) => value === 'settled' ? 'Pago' : 'Pendente'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Total da Lista */}
          {sortedDespesas.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-muted/50 px-4 py-2 rounded-lg border">
                <span className="text-sm font-medium text-muted-foreground">SOMA</span>
                <span className="ml-2 text-lg font-bold text-red-600">
                  R$ {sortedDespesas.reduce((total, despesa) => total + despesa.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção do Calendário */}
      <Suspense fallback={<div>Carregando calendário...</div>}>
        <DespesasCalendar />
      </Suspense>

      {/* Animação de Sucesso */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <div className="w-32 h-32 mb-4">
              <Lottie
                animationData={{
                  v: "5.7.4",
                  fr: 30,
                  ip: 0,
                  op: 60,
                  w: 200,
                  h: 200,
                  nm: "Success",
                  ddd: 0,
                  assets: [],
                  layers: [
                    {
                      ddd: 0,
                      ind: 1,
                      ty: 4,
                      nm: "Circle",
                      sr: 1,
                      ks: {
                        o: { a: 0, k: 100 },
                        r: { a: 0, k: 0 },
                        p: { a: 0, k: [100, 100, 0] },
                        a: { a: 0, k: [0, 0, 0] },
                        s: { a: 1, k: [
                          { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [0, 0, 100] },
                          { t: 20, s: [100, 100, 100] }
                        ]}
                      },
                      ao: 0,
                      shapes: [
                        {
                          ty: "gr",
                          it: [
                            {
                              d: 1,
                              ty: "el",
                              s: { a: 0, k: [80, 80] },
                              p: { a: 0, k: [0, 0] }
                            },
                            {
                              ty: "st",
                              c: { a: 0, k: [0.2, 0.8, 0.2, 1] },
                              o: { a: 0, k: 100 },
                              w: { a: 0, k: 4 }
                            },
                            {
                              ty: "tr",
                              p: { a: 0, k: [0, 0] },
                              a: { a: 0, k: [0, 0] },
                              s: { a: 0, k: [100, 100] },
                              r: { a: 0, k: 0 },
                              o: { a: 0, k: 100 }
                            }
                          ],
                          bm: 0
                        }
                      ],
                      ip: 0,
                      op: 60,
                      st: 0,
                      bm: 0
                    },
                    {
                      ddd: 0,
                      ind: 2,
                      ty: 4,
                      nm: "Check",
                      sr: 1,
                      ks: {
                        o: { a: 0, k: 0, ix: 11 },
                        r: { a: 0, k: 0 },
                        p: { a: 0, k: [100, 100, 0] },
                        a: { a: 0, k: [0, 0, 0] },
                        s: { a: 0, k: [100, 100, 100] }
                      },
                      ao: 0,
                      shapes: [
                        {
                          ty: "gr",
                          it: [
                            {
                              d: 1,
                              ty: "rc",
                              s: { a: 0, k: [20, 20] },
                              p: { a: 0, k: [0, 0] },
                              r: { a: 0, k: 0 }
                            },
                            {
                              ty: "st",
                              c: { a: 0, k: [1, 1, 1, 1] },
                              o: { a: 0, k: 100 },
                              w: { a: 0, k: 3 }
                            },
                            {
                              ty: "tr",
                              p: { a: 0, k: [0, 0] },
                              a: { a: 0, k: [0, 0] },
                              s: { a: 0, k: [100, 100] },
                              r: { a: 0, k: 0 },
                              o: { a: 0, k: 100 }
                            }
                          ],
                          bm: 0
                        }
                      ],
                      ip: 15,
                      op: 60,
                      st: 15,
                      bm: 0
                    }
                  ],
                  markers: []
                }}
                loop={false}
                autoplay={true}
                style={{ width: 128, height: 128 }}
              />
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Sucesso!</h3>
            <p className="text-gray-600 text-center">
              Status da dívida atualizado com sucesso!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Despesas;
