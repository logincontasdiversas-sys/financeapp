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
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useSupabaseExpenses } from "@/hooks/useSupabaseExpenses";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
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
      processedFormData.category_id = selectedDebt.category_id;
      (processedFormData as any).debt_id = debtId;
    }
    
    return processedFormData;
  };

  // Atualizar transação existente
  const updateTransaction = async (id: string, processedFormData: any) => {
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
    const { data: settledTransactions, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('kind', 'expense')
      .eq('debt_id', debtId)
      .eq('status', 'settled');

    if (error) return;

    const newPaidAmount = settledTransactions?.reduce((sum, transaction) => {
      return sum + Number(transaction.amount || 0);
    }, 0) || 0;

    const debt = debts.find(d => d.id === debtId);
    const isFullyPaid = debt?.total_amount ? newPaidAmount >= debt.total_amount : false;

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
    setFormData({
      title: despesa.title,
      amount: despesa.amount.toString(),
      date: despesa.date,
      category_id: despesa.category_id || "",
      bank_id: despesa.bank_id || "",
      card_id: despesa.card_id || "",
      status: despesa.status,
      payment_method: despesa.payment_method || "",
      note: despesa.note || "",
      invoice_month_year: "",
    });
    setIsDialogOpen(true);
  };

  // Funções auxiliares para edição inline
  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    if (!user || !tenantId) return;

    try {
      const updateData: any = {};
      updateData[field] = value;
      
      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setDespesas(prev => 
        prev.map(d => d.id === id ? { ...d, [field]: value } : d)
      );

      // Recálculo de dívida se necessário
      if (field === 'status') {
        const transaction = despesas.find(d => d.id === id);
        if (transaction && (transaction as any).debt_id) {
          await recalculateDebt((transaction as any).debt_id);
        }
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
    <div className="space-y-6">
      {/* Resumo */}
      <DespesasSummaryWithDateSync 
        key={summaryRefreshKey}
      />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyChart />
        <SingleLineChart dataType="expense" />
      </div>

      {/* Calendário */}
      <Suspense fallback={<div>Carregando calendário...</div>}>
        <DespesasCalendar />
      </Suspense>

      {/* Lista de Despesas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Despesas</CardTitle>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
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
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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
                      <Label htmlFor="note">Observação</Label>
                      <Input
                        id="note"
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingDespesa ? 'Atualizar' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-4 space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Buscar despesas..."
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={paymentMethodFilter}
                onValueChange={(value: any) => setPaymentMethodFilter(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os métodos</SelectItem>
                  <SelectItem value="normal">Dinheiro/Débito</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === despesas.length && despesas.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('title')} className="flex items-center gap-1">
                      Título
                      {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('amount')} className="flex items-center gap-1">
                      Valor
                      {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1">
                      Data
                      {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                      Status
                      {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead>Ações</TableHead>
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
                    <TableCell>
                      <InlineEditText
                        value={despesa.title}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'title', value)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditNumber
                        value={despesa.amount}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'amount', value)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditDate
                        value={despesa.date}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'date', value)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span>{despesa.categories?.emoji}</span>
                        <span>{despesa.categories?.name}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <InlineEditSelect
                        value={despesa.status}
                        onSave={(value) => handleInlineUpdate(despesa.id, 'status', value)}
                        options={[
                          { value: 'pending', label: 'Pendente' },
                          { value: 'settled', label: 'Pago' }
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(despesa)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(despesa)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(despesa.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Ações em lote */}
          {selectedItems.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedItems.length} item(s) selecionado(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Selecionados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedItems([]);
                      setSelectionMode(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Despesas;
