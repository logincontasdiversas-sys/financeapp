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
  category_id: string;
}

interface Debt {
  id: string;
  title: string;
  paid_amount: number;
  category_id: string;
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

  const getMonthsOptions = (baseDateStr: string) => {
    const base = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const options: { value: string; label: string }[] = [];
    
    // Começar do próximo mês (não incluir o mês vigente)
    for (let i = 1; i <= 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      // Pular o mês vigente
      if (year === currentYear && month === currentMonth) {
        continue;
      }
      
      const monthStr = String(month + 1).padStart(2, '0');
      const value = `${year}-${monthStr}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

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
    debounceMs: 300, // Reduzir debounce para updates mais rápidos
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

  // Realtime sync para categorias (para refletir renomes/edições na lista de despesas)
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
    const selectedCategory = categories.find(cat => cat.id === formData.category_id);
    const shouldShowInvoiceField = selectedCategory && isInvoiceCategory(selectedCategory.name);
    setShowInvoiceField(shouldShowInvoiceField);
    
    if (shouldShowInvoiceField) {
      logger.debug('DESPESAS_INVOICE', 'Campo MM-AA ativado para categoria de fatura', {
        categoryName: selectedCategory?.name
      });
    }
  }, [formData.category_id, categories, isInvoiceCategory]);

  // Monitorar mudança de forma de pagamento para mostrar/ocultar campo de cartão
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
      logger.info('DESPESAS_LOAD', 'Iniciando carregamento de despesas', { tenantId });
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            emoji
          ),
          banks (
            name
          ),
          credit_cards (
            name
          )
        `)
        .eq('kind', 'expense')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) throw error;
      
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
        // Não filtrar por is_system aqui, pois precisamos de todas as categorias para despesas
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
        .select('id, name')
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
        .select('id, name')
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
        .select('id, title, current_amount, category_id')
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
        .select('id, title, paid_amount, category_id')
        .eq('settled', false)
        .order('title');

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error('[DESPESAS] Error loading debts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      // Processar category_id se for goal ou debt
      const processedFormData = { ...formData };
      
      if (formData.category_id.startsWith('goal-')) {
        // É uma meta - extrair o ID e processar diferentemente
        const goalId = formData.category_id.replace('goal-', '');
        const selectedGoal = goals.find(g => g.id === goalId);
        
        if (selectedGoal) {
          // Atualizar a meta com o valor da despesa
          const newAmount = selectedGoal.current_amount + parseFloat(formData.amount);
          await supabase
            .from('goals')
            .update({ current_amount: newAmount })
            .eq('id', goalId);

          // Garantir que a categoria personalizada exista e esteja vinculada à meta
          let goalCategoryId: string | undefined = selectedGoal.category_id || undefined;
          if (goalCategoryId) {
            const { data: existingCat } = await supabase
              .from('categories')
              .select('id')
              .eq('id', goalCategoryId)
              .maybeSingle();
            if (!existingCat) {
              goalCategoryId = undefined;
            }
          }
          if (!goalCategoryId) {
            const { data: newCategory, error: catErr } = await supabase
              .from('categories')
              .insert({
                name: `${selectedGoal.title} - Meta`,
                emoji: '🎯',
                tenant_id: tenantId!,
                archived: false,
              })
              .select('id')
              .single();
            if (catErr) throw catErr;
            goalCategoryId = newCategory.id;
            await supabase
              .from('goals')
              .update({ category_id: goalCategoryId })
              .eq('id', goalId);
          }
          
          // Associar a categoria válida à transação
          processedFormData.category_id = goalCategoryId;
        }
      } else if (formData.category_id.startsWith('debt-')) {
        // É uma dívida - extrair o ID e processar diferentemente
        const debtId = formData.category_id.replace('debt-', '');
        const selectedDebt = debts.find(d => d.id === debtId);
        
        if (selectedDebt) {
          // Atualizar a dívida com o valor pago
          const newPaidAmount = selectedDebt.paid_amount + parseFloat(formData.amount);
          await supabase
            .from('debts')
            .update({ paid_amount: newPaidAmount })
            .eq('id', debtId);

          // Garantir que a categoria personalizada exista e esteja vinculada à dívida
          let debtCategoryId: string | undefined = selectedDebt.category_id || undefined;
          if (debtCategoryId) {
            const { data: existingCat } = await supabase
              .from('categories')
              .select('id')
              .eq('id', debtCategoryId)
              .maybeSingle();
            if (!existingCat) {
              debtCategoryId = undefined;
            }
          }
          if (!debtCategoryId) {
            const { data: newCategory, error: catErr } = await supabase
              .from('categories')
              .insert({
                name: `${selectedDebt.title} - Dívida`,
                emoji: '💳',
                tenant_id: tenantId!,
                archived: false,
              })
              .select('id')
              .single();
            if (catErr) throw catErr;
            debtCategoryId = newCategory.id;
            await supabase
              .from('debts')
              .update({ category_id: debtCategoryId })
              .eq('id', debtId);
          }
          
          // Associar a categoria válida à transação
          processedFormData.category_id = debtCategoryId;
        }
      }

      if (editingDespesa) {
        await updateExpense(editingDespesa.id, processedFormData);
      } else {
        // Se for transferência, criar duas transações
        if (isTransfer && transferToBankId && transferCategoryId) {
          const amount = parseFloat(processedFormData.amount);
          const fromBank = banks.find(b => b.id === processedFormData.bank_id);
          const toBank = banks.find(b => b.id === transferToBankId);
          
          if (!fromBank || !toBank) {
            toast({
              title: "Erro",
              description: "Bancos não encontrados.",
              variant: "destructive"
            });
            return;
          }

          // Criar duas transações: saída e entrada
          const transactions = [
            {
              title: processedFormData.title, // Usar a descrição do usuário
              amount: amount,
              date: processedFormData.date,
              category_id: transferCategoryId,
              bank_id: processedFormData.bank_id,
              kind: 'expense', // Despesa no banco de origem
              status: 'settled',
              payment_method: processedFormData.payment_method === 'transfer_pix' ? 'PIX' : 'DOC/TED',
              note: `Transferência para ${toBank.name}${processedFormData.note ? ` - ${processedFormData.note}` : ''}`,
              user_id: user.id,
              tenant_id: tenantId,
            },
            {
              title: processedFormData.title, // Usar a descrição do usuário
              amount: amount,
              date: processedFormData.date,
              category_id: transferCategoryId,
              bank_id: transferToBankId,
              kind: 'income', // Receita no banco de destino
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
        } else {
          const created = await createExpense(processedFormData);
        if (created) {
          setDespesas(prev => [
            {
              id: created.id,
              title: created.title,
              amount: Number(created.amount),
              date: created.date,
              category_id: created.category_id,
              bank_id: created.bank_id,
              card_id: created.card_id,
              status: created.status,
              payment_method: created.payment_method,
              note: created.note,
            } as unknown as Transaction,
            ...prev,
          ]);
        }

        // Se marcado para repetir, inserir cópias nos meses selecionados
        if (repeatEnabled && repeatMonths.length > 0) {
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
              return key > baseKey; // futuros somente
            })
            .map((ym) => {
              const [yStr, mStr] = ym.split('-');
              const y = parseInt(yStr, 10);
              const m = parseInt(mStr, 10) - 1; // month index
              const { invoice_month_year, ...transactionData } = processedFormData;
              
              // Normalize UUID fields to null if empty
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

          // Debug: log dos dados antes de inserir
          console.log('[DESPESAS DEBUG] Dados das transações repetidas:', extraRows);
          
          // Inserir diretamente no banco para evitar validações extras
          const { data: insertedRows, error: bulkErr } = await supabase
            .from('transactions')
            .insert(extraRows)
            .select();
          if (bulkErr) {
            console.error('[DESPESAS DEBUG] Erro ao inserir transações repetidas:', bulkErr);
            throw bulkErr;
          }
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
        }
      }

      setIsDialogOpen(false);
      setEditingDespesa(null);
      resetForm();
      setRepeatEnabled(false);
      setRepeatMonths([]);
      
      // Forçar reload da lista de despesas após salvar
      logger.info('DESPESAS_FORM', 'Forçando reload após salvar despesa');
      clearQueryCache();
      setTimeout(() => {
        loadDespesas();
      }, 200);
      
      loadGoals(); // Recarregar metas
      loadDebts(); // Recarregar dívidas
      setSummaryRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error saving:', error);
      toast({
        title: "Erro ao salvar despesa",
        description: error.message,
        variant: "destructive",
      });
    }
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

  const handleDuplicate = (despesa: Transaction) => {
    setEditingDespesa(null);
    setFormData({
      title: `${despesa.title} (Cópia)`,
      amount: despesa.amount.toString(),
      date: new Date().toISOString().split('T')[0], // Data atual
      category_id: despesa.category_id || "",
      bank_id: despesa.bank_id || "",
      card_id: "",
      status: despesa.status,
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

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    try {
      // Otimista: remove imediatamente e guarda backup
      const previous = despesas;
      setDespesas(prev => prev.filter(d => d.id !== id));

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        setDespesas(previous); // rollback
        throw error;
      }
      toast({ title: "Despesa excluída com sucesso!" });
      clearQueryCache();
      setSummaryRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error deleting:', error);
      toast({
        title: "Erro ao excluir despesa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    if (!user || !tenantId) return;

    try {
      const updateData: any = {};
      
      if (field === 'date') {
        updateData[field] = dateInputToISO(value);
      } else if (field === 'category_id') {
        // Processar category_id se for goal ou debt
        if (value && value.startsWith('goal-')) {
          const goalId = value.replace('goal-', '');
          const selectedGoal = goals.find(g => g.id === goalId);
          if (selectedGoal) {
            // Buscar ou criar categoria para a meta
            let goalCategoryId = selectedGoal.category_id;
            if (!goalCategoryId) {
              const { data: newCategory, error: catErr } = await supabase
                .from('categories')
                .insert({
                  name: `${selectedGoal.title} - Meta`,
                  emoji: '🎯',
                  tenant_id: tenantId!,
                  archived: false,
                })
                .select('id')
                .single();
              if (catErr) throw catErr;
              goalCategoryId = newCategory.id;
              await supabase
                .from('goals')
                .update({ category_id: goalCategoryId })
                .eq('id', goalId);
            }
            updateData[field] = goalCategoryId;
          }
        } else if (value && value.startsWith('debt-')) {
          const debtId = value.replace('debt-', '');
          const selectedDebt = debts.find(d => d.id === debtId);
          if (selectedDebt) {
            // Buscar ou criar categoria para a dívida
            let debtCategoryId = selectedDebt.category_id;
            if (!debtCategoryId) {
              const { data: newCategory, error: catErr } = await supabase
                .from('categories')
                .insert({
                  name: `${selectedDebt.title} - Dívida`,
                  emoji: '💳',
                  tenant_id: tenantId!,
                  archived: false,
                })
                .select('id')
                .single();
              if (catErr) throw catErr;
              debtCategoryId = newCategory.id;
              await supabase
                .from('debts')
                .update({ category_id: debtCategoryId })
                .eq('id', debtId);
            }
            updateData[field] = debtCategoryId;
          }
        } else {
          updateData[field] = value;
        }
      } else {
        updateData[field] = value;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Despesa atualizada com sucesso!" });
      clearQueryCache();
      // Atualização otimista imediata na lista
      setDespesas(prev => prev.map(d => {
        if (d.id !== id) return d;
        const next: any = { ...d };
        next[field as keyof typeof next] = updateData[field as keyof typeof updateData];
        if (field === 'amount') next.amount = Number(updateData.amount);
        return next as typeof d;
      }));

      // Garantia extra: recarregar
        loadDespesas();
      setSummaryRefreshKey(k => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error updating inline:', error);
      toast({
        title: "Erro ao atualizar despesa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} despesa(s)?`)) return;

    try {
      // Processar em lotes de 50 para evitar URLs muito longas
      const batchSize = 50;
      let deletedCount = 0;
      // Otimista: remover já da lista e guardar backup para rollback
      const previous = despesas;
      setDespesas(prev => prev.filter(d => !selectedItems.includes(d.id)));
      
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize);
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('id', batch);

        if (error) {
          setDespesas(previous); // rollback
          throw error;
        }
        deletedCount += batch.length;
      }

      toast({ title: `${deletedCount} despesa(s) excluída(s) com sucesso!` });
      setSelectedItems([]);
      clearQueryCache();
      setSummaryRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error('[DESPESAS] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir despesas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Selecionar apenas os itens filtrados/visíveis
      const filteredItems = getFilteredAndSortedDespesas();
      setSelectedItems(filteredItems.map(d => d.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

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
    setRepeatEnabled(false);
    setRepeatMonths([]);
    setShowInvoiceField(false);
    setShowCardField(false);
    setIsTransfer(false);
    setTransferToBankId("");
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

  const formatPaymentMethod = (paymentMethod: string) => {
    const paymentMethods: { [key: string]: string } = {
      'money': 'Dinheiro',
      'debit_card': 'Cartão de Débito',
      'debit_account': 'Débito em Conta',
      'credit_card': 'Cartão de Crédito',
      'pix': 'PIX',
      'bank_transfer': 'Transferência'
    };
    return paymentMethods[paymentMethod] || paymentMethod;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFilteredAndSortedDespesas = () => {
    let filteredDespesas = despesas;

    // Aplicar filtro de texto
    if (textFilter.trim()) {
      const searchTerm = textFilter.toLowerCase().trim();
      filteredDespesas = filteredDespesas.filter(despesa => 
        despesa.title.toLowerCase().includes(searchTerm) ||
        (despesa.categories?.name || '').toLowerCase().includes(searchTerm) ||
        (despesa.banks?.name || '').toLowerCase().includes(searchTerm) ||
        (despesa.credit_cards?.name || '').toLowerCase().includes(searchTerm) ||
        formatPaymentMethod(despesa.payment_method || '').toLowerCase().includes(searchTerm) ||
        (despesa.note || '').toLowerCase().includes(searchTerm) ||
        formatCurrency(despesa.amount).toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar filtro de método de pagamento
    if (paymentMethodFilter !== 'all') {
      filteredDespesas = filteredDespesas.filter(despesa => {
        if (paymentMethodFilter === 'credit_card') {
          return despesa.payment_method === 'credit_card' && despesa.card_id;
        } else if (paymentMethodFilter === 'normal') {
          return despesa.payment_method !== 'credit_card' || !despesa.card_id;
        }
        return true;
      });
    }

    // Aplicar filtro de data
    if (sharedDateFilter && sharedDateFilter.from && sharedDateFilter.to) {
      console.log('[DESPESAS FILTER] Aplicando filtro de data na tabela:', {
        from: sharedDateFilter.from,
        to: sharedDateFilter.to,
        totalDespesas: filteredDespesas.length
      });
      
      filteredDespesas = filteredDespesas.filter(despesa => {
        // Criar datas locais para evitar problemas de timezone
        const despesaDate = new Date(despesa.date + 'T00:00:00');
        const fromDate = new Date(sharedDateFilter.from!.getFullYear(), sharedDateFilter.from!.getMonth(), sharedDateFilter.from!.getDate());
        const toDate = new Date(sharedDateFilter.to!.getFullYear(), sharedDateFilter.to!.getMonth(), sharedDateFilter.to!.getDate());
        
        const isWithinRange = despesaDate >= fromDate && despesaDate <= toDate;
        
        if (despesa.date === '2025-09-01') {
          console.log('[DESPESAS FILTER] Verificando despesa 01/09:', {
            despesaDate: despesaDate.toISOString(),
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            isWithinRange,
            despesa: despesa.title
          });
        }
        
        return isWithinRange;
      });
      
      console.log('[DESPESAS FILTER] Despesas filtradas:', filteredDespesas.length);
    }

    // Aplicar ordenação
    if (!sortField) return filteredDespesas;

    return [...filteredDespesas].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.categories?.name?.toLowerCase() || '';
          bValue = b.categories?.name?.toLowerCase() || '';
          break;
        case 'bank':
          aValue = (a.credit_cards?.name || a.banks?.name || '').toLowerCase();
          bValue = (b.credit_cards?.name || b.banks?.name || '').toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'payment_method':
          aValue = formatPaymentMethod(a.payment_method || '').toLowerCase();
          bValue = formatPaymentMethod(b.payment_method || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
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

  if (loading || tenantLoading) {
    return <div className="flex items-center justify-center h-32">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Despesas</h2>
          <p className="text-muted-foreground">
            Controle seus gastos e despesas
          </p>
        </div>
        
        <div className="flex gap-2">
          <ImportCSV />
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
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  categories={categories}
                  onCategoriesChange={setCategories}
                  goals={goals}
                  debts={debts}
                />
              </div>
              {/* Campo MM-AA dinâmico para categorias de fatura - movido para logo após categoria */}
              {showInvoiceField && (
                <div className="space-y-2 p-3 bg-primary/5 rounded border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label htmlFor="invoice_month_year">Mês/Ano da Fatura (MM-AA)</Label>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <Select
                    value={formData.invoice_month_year}
                    onValueChange={(value) => setFormData({ ...formData, invoice_month_year: value })}
                    required={showInvoiceField}
                  >
                    <SelectTrigger className="border-primary/30">
                      <SelectValue placeholder="Ex: 12-24" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50 overflow-y-auto">
                      {getValidMonthYearOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 Este campo é obrigatório para categorias de fatura de cartão
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Forma de Pagamento</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                   <SelectContent className="bg-background border z-50 overflow-y-auto">
                     <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                       Métodos Convencionais
                     </div>
                     <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                     <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                     <SelectItem value="debit_account">Débito em Conta</SelectItem>
                     <SelectItem value="money">Dinheiro</SelectItem>
                     <SelectItem value="pix">PIX</SelectItem>
                     <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-t mt-1 pt-2">
                       Transferências entre Bancos
                     </div>
                     <SelectItem value="transfer_pix">Transferência PIX</SelectItem>
                     <SelectItem value="transfer_doc_ted">Transferência DOC/TED</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               {/* Campo Banco - oculto quando for cartão de crédito */}
               {formData.payment_method !== 'credit_card' && (
                 <div className="space-y-2">
                   <Label htmlFor="bank">Banco</Label>
                   <Select
                     value={formData.bank_id}
                     onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione um banco" />
                     </SelectTrigger>
                     <SelectContent className="bg-background border z-50 overflow-y-auto">
                       {banks.map((bank) => (
                         <SelectItem key={bank.id} value={bank.id}>
                           {bank.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}

               {/* Opção de Transferência entre Bancos */}
               {(formData.payment_method === 'transfer_pix' || formData.payment_method === 'transfer_doc_ted') && formData.bank_id && (
                 <div className="space-y-3 border rounded-md p-3">
                   <div className="flex items-center gap-2">
                     <Checkbox
                       id="isTransfer"
                       checked={isTransfer}
                       onCheckedChange={(checked) => {
                         setIsTransfer(Boolean(checked));
                         if (!checked) {
                           setTransferToBankId("");
                         }
                       }}
                     />
                     <Label htmlFor="isTransfer" className="flex items-center gap-2">
                       <ArrowRightLeftIcon className="h-4 w-4" />
                       Transferir para outro banco
                     </Label>
                   </div>
                   
                   {isTransfer && (
                     <div className="space-y-2">
                       <Label htmlFor="transferToBank">Transferir para:</Label>
                       <Select
                         value={transferToBankId}
                         onValueChange={setTransferToBankId}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione o banco de destino" />
                         </SelectTrigger>
                         <SelectContent className="bg-background border z-50 overflow-y-auto">
                           {banks
                             .filter(bank => bank.id !== formData.bank_id)
                             .map((bank) => (
                               <SelectItem key={bank.id} value={bank.id}>
                                 {bank.name}
                               </SelectItem>
                             ))}
                         </SelectContent>
                       </Select>
                     </div>
                   )}
                 </div>
               )}

               {/* Campo de seleção de cartão quando forma de pagamento for cartão de crédito */}
               {showCardField && (
                 <div className="space-y-2 p-3 bg-blue-50 rounded border border-blue-200">
                   <Label htmlFor="card">Cartão de Crédito</Label>
                   <Select
                     value={formData.card_id}
                     onValueChange={(value) => setFormData({ ...formData, card_id: value })}
                     required={showCardField}
                   >
                     <SelectTrigger className="border-blue-300">
                       <SelectValue placeholder="Selecione o cartão" />
                     </SelectTrigger>
                     <SelectContent className="bg-background border z-50 overflow-y-auto">
                       {creditCards.map((card) => (
                         <SelectItem key={card.id} value={card.id}>
                           {card.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
               <div className="space-y-2">
                 <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                         <SelectContent className="bg-background border z-50 overflow-y-auto">
                    <SelectItem value="settled">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Label htmlFor="repeat">Este lançamento se repete em outros meses?</Label>
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
              <div className="space-y-2">
                <Label htmlFor="note">Observações</Label>
                <Input
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
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
        refreshKey={summaryRefreshKey} 
        onDateFilterChange={setSharedDateFilter}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <CardTitle>Lista de Despesas</CardTitle>
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSelected()}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateSelected()}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicar
                  </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                    Excluir ({selectedItems.length})
                </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-48">
                <Select value={paymentMethodFilter} onValueChange={(value: 'all' | 'normal' | 'credit_card') => setPaymentMethodFilter(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as despesas</SelectItem>
                    <SelectItem value="normal">Despesas normais</SelectItem>
                    <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-72">
              <Input
                placeholder="Filtrar por título, categoria, banco, valor..."
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                className="h-9"
              />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Layout Mobile - Cards */}
          <div className="block sm:hidden space-y-3">
            {/* Botão de Seleção Global - Mobile */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedItems.length === despesas.length && despesas.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItems(despesas.map(d => d.id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                />
                <span className="text-sm font-medium">
                  {selectedItems.length > 0 ? `Selecionados: ${selectedItems.length}` : 'Selecionar todos'}
                </span>
              </div>
              {selectedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Cancelar
                </Button>
              )}
            </div>

            {(() => {
              const groupedByDate = getFilteredAndSortedDespesas().reduce((acc, despesa) => {
                const date = despesa.date;
                if (!acc[date]) {
                  acc[date] = [];
                }
                acc[date].push(despesa);
                return acc;
              }, {} as Record<string, typeof despesas>);

              return Object.entries(groupedByDate).map(([date, despesasOfDate]) => (
                <div key={date} className="bg-muted/50 rounded-lg p-4 mb-4 relative">
                  {/* Removido checkbox global do grupo (lado direito) */}
                  {/* Grid Padronizado - 12 colunas */}
                  <div className="grid grid-cols-12 gap-1.5 relative auto-rows-[56px] -ml-[10px]">
                    {/* Linha Vertical - conecta ponto a ponto */}
                    {despesasOfDate.length > 1 && (
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-12 gap-1.5">
                        <div className="col-start-3 relative justify-self-center">
                          <div className="absolute left-1/2 -translate-x-1/2 w-[3px] bg-orange-500 rounded-full" style={{ top: '2.05rem', height: `${(despesasOfDate.length - 1) * 64}px` }} />
                        </div>
                      </div>
                    )}
                    
                    {despesasOfDate.map((despesa, index) => (
                      <div key={despesa.id} className="contents">
                        {/* Checkbox individual à esquerda, fora do campo de lançamentos */}
                        <div
                          className="absolute -left-[16px] z-20"
                          style={{ top: `calc(2.05rem + ${index * 64}px - 12px)` }}
                        >
                          <Checkbox
                            checked={selectedItems.includes(despesa.id)}
                            onCheckedChange={(checked) => handleSelectItem(despesa.id, checked as boolean)}
                          />
                        </div>
                        {/* Data - Colunas 1-2 (apenas no primeiro item) */}
                        {index === 0 && (
                          <div className="col-span-2 text-center">
                            <div className="text-lg font-bold">
                              {formatDateForMobile(despesa.date).day}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateForMobile(despesa.date).month}
                            </div>
                          </div>
                        )}
                        
                        {/* Espaçador quando não é o primeiro item */}
                        {index > 0 && (
                          <div className="col-span-2">
                          </div>
                        )}
                        
                        {/* Ponto da Timeline - Coluna 3 */}
                        <div className="col-span-1 flex items-center justify-center relative z-10">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                        </div>
                        
                        {/* Descrição + Valor - Colunas 4-12 */}
                        <div className="col-span-9 min-w-0 relative h-full">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-sm truncate">{despesa.title}</p>
                            <p className="font-bold text-sm text-red-600 whitespace-nowrap">-{formatCurrency(despesa.amount)}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {despesa.categories?.emoji && (
                              <span>{despesa.categories.emoji}</span>
                            )}
                            <span className="truncate">
                              {despesa.categories?.name || 'Sem categoria'}
                            </span>
                            {despesa.banks?.name && (
                              <span className="truncate">• {despesa.banks.name}</span>
                            )}
                            {despesa.credit_cards?.name && (
                              <span className="truncate">• {despesa.credit_cards.name}</span>
                            )}
                          </div>
                          <p className="absolute left-0 bottom-0 text-xs text-muted-foreground">
                            {despesa.status === 'settled' ? 'Pago' : 'Pendente'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Layout Desktop - Tabela */}
          <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                   <Checkbox
                     checked={selectedItems.length === getFilteredAndSortedDespesas().length && getFilteredAndSortedDespesas().length > 0}
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
                    label="Banco"
                    sortKey="bank"
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
                    label="Forma de Pagamento"
                    sortKey="payment_method"
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
              {getFilteredAndSortedDespesas().map((despesa) => (
                <TableRow key={despesa.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(despesa.id)}
                      onCheckedChange={(checked) => handleSelectItem(despesa.id, checked as boolean)}
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
                    <InlineCategorySelect
                      value={despesa.category_id || ""}
                      categories={categories}
                      onCategoriesChange={setCategories}
                      goals={goals}
                      debts={debts}
                      onSave={(value) => handleInlineUpdate(despesa.id, 'category_id', value || null)}
                      getDisplayValue={(value) => {
                        if (!value) return "Sem categoria";
                        const category = categories.find(c => c.id === value);
                        return category ? `${category.emoji} ${category.name}` : "Sem categoria";
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditSelect
                      value={despesa.bank_id || despesa.card_id || ""}
                      options={[
                        { value: "__none__", label: "Nenhum" },
                        ...banks.map(bank => ({ 
                          value: bank.id, 
                          label: `🏦 ${bank.name}` 
                        })),
                        ...creditCards.map(card => ({ 
                          value: card.id, 
                          label: `💳 ${card.name}` 
                        }))
                      ]}
                      onSave={(value) => {
                        // Determinar se é um banco ou cartão baseado no valor
                        const isBank = banks.some(b => b.id === value);
                        const isCard = creditCards.some(c => c.id === value);
                        
                        if (isBank) {
                          handleInlineUpdate(despesa.id, 'bank_id', value);
                          if (despesa.card_id) {
                            handleInlineUpdate(despesa.id, 'card_id', null);
                          }
                        } else if (isCard) {
                          handleInlineUpdate(despesa.id, 'card_id', value);
                          if (despesa.bank_id) {
                            handleInlineUpdate(despesa.id, 'bank_id', null);
                          }
                        } else {
                          handleInlineUpdate(despesa.id, 'bank_id', null);
                          handleInlineUpdate(despesa.id, 'card_id', null);
                        }
                      }}
                      getDisplayValue={(value) => {
                        if (!value) return "Nenhum";
                        const bank = banks.find(b => b.id === value);
                        const card = creditCards.find(c => c.id === value);
                        if (bank) return `🏦 ${bank.name}`;
                        if (card) return `💳 ${card.name}`;
                        return "Nenhum";
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-red-600 font-semibold">
                    <InlineEditNumber
                      value={despesa.amount}
                      onSave={(value) => handleInlineUpdate(despesa.id, 'amount', value)}
                      formatValue={formatCurrency}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditDate
                      value={despesa.date}
                      onSave={(value) => handleInlineUpdate(despesa.id, 'date', value)}
                      formatValue={formatDate}
                    />
                  </TableCell>
                   <TableCell>
                     <InlineEditSelect
                       value={despesa.payment_method || ""}
                       options={[
                         { value: "__none__", label: "Não informado" },
                         { value: "money", label: "Dinheiro" },
                         { value: "debit_card", label: "Cartão de Débito" },
                         { value: "debit_account", label: "Débito em Conta" },
                         { value: "credit_card", label: "Cartão de Crédito" },
                         { value: "pix", label: "PIX" },
                         { value: "bank_transfer", label: "Transferência" }
                       ]}
                       onSave={(value) => handleInlineUpdate(despesa.id, 'payment_method', value || null)}
                       getDisplayValue={(value) => value ? formatPaymentMethod(value) : "Não informado"}
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
          {getFilteredAndSortedDespesas().length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-muted/50 px-4 py-2 rounded-lg border">
                <span className="text-sm font-medium text-muted-foreground">SOMA</span>
                <span className="ml-2 text-lg font-bold text-red-600">
                  {formatCurrency(
                    getFilteredAndSortedDespesas().reduce((total, despesa) => total + despesa.amount, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Suspense fallback={<div className="animate-pulse bg-muted h-48 rounded" />}>
        <DespesasCalendar />
      </Suspense>
    </div>
  );
};

// Componente para edição inline de categoria com popup organizado
const InlineCategorySelect = ({ 
  value, 
  categories, 
  onCategoriesChange, 
  goals, 
  debts, 
  onSave, 
  getDisplayValue 
}: {
  value: string;
  categories: any[];
  onCategoriesChange: (categories: any[]) => void;
  goals: any[];
  debts: any[];
  onSave: (value: string | null) => void;
  getDisplayValue: (value: string) => string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onSave(tempValue === "__none__" ? null : tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="min-w-[200px]">
        <CategorySelect
          value={tempValue}
          onValueChange={setTempValue}
          categories={categories}
          onCategoriesChange={onCategoriesChange}
          goals={goals}
          debts={debts}
        />
        <div className="flex gap-1 mt-2">
          <Button size="sm" onClick={handleSave} className="h-6 px-2 text-xs">
            ✓
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} className="h-6 px-2 text-xs">
            ✕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer hover:bg-muted/50 p-1 rounded min-w-[120px]"
      onClick={() => setIsEditing(true)}
    >
      {getDisplayValue(value)}
    </div>
  );
};

export default Despesas;