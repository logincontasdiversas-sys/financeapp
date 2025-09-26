import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from './useStableAuth';
import { useTenant } from './useTenant';
import { useSupabaseCards } from './useSupabaseCards';
import { useToast } from './use-toast';
import { dateInputToISO } from "@/utils/dateUtils";
import { logger } from '@/utils/logger';
import { clearQueryCache } from './useSupabaseQuery';

// Normalize optional UUID-like strings to null or valid UUID
const normalizeOptionalUUID = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
};

interface ExpenseFormData {
  title: string;
  amount: string;
  date: string;
  category_id: string;
  bank_id: string;
  card_id: string;
  status: string;
  payment_method: string;
  note: string;
  invoice_month_year?: string; // Campo MM-AA para faturas
  debt_special_category_id?: string; // Campo para vincular transação à dívida específica
  goal_special_category_id?: string; // Campo para vincular transação à meta específica
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

export const useSupabaseExpenses = () => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const { processInvoicePayment } = useSupabaseCards();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Validar formato MM-AA
  const validateMonthYear = useCallback((monthYear: string): boolean => {
    if (!monthYear || monthYear.length !== 5) return false;
    
    const [month, year] = monthYear.split('-');
    const monthNum = parseInt(month);
    const yearNum = parseInt(`20${year}`);
    const currentYear = new Date().getFullYear();
    
    // Validações
    if (monthNum < 1 || monthNum > 12) return false;
    if (yearNum < currentYear || yearNum > currentYear + 1) return false;
    
    return true;
  }, []);

  // Verificar se categoria é de fatura
  const isInvoiceCategory = useCallback((categoryName: string): boolean => {
    return categoryName.includes('- Fatura');
  }, []);

  // Gerar opções de mês/ano válidas
  const getValidMonthYearOptions = useMemo(() => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Últimos 3 meses do ano atual
    for (let month = Math.max(1, currentMonth - 2); month <= 12; month++) {
      const yearShort = currentYear.toString().slice(-2);
      const monthStr = month.toString().padStart(2, '0');
      options.push({
        value: `${monthStr}-${yearShort}`,
        label: `${monthStr}/${yearShort}`,
      });
    }

    // Primeiros 12 meses do próximo ano
    const nextYear = currentYear + 1;
    const nextYearShort = nextYear.toString().slice(-2);
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      options.push({
        value: `${monthStr}-${nextYearShort}`,
        label: `${monthStr}/${nextYearShort}`,
      });
    }

    return options;
  }, []);

  // Criar despesa com lógica especial para faturas
  const createExpense = useCallback(async (formData: ExpenseFormData) => {
    if (!user || !tenantId) {
      throw new Error('Usuário ou tenant não encontrado');
    }

    setLoading(true);
    try {
      logger.info('EXPENSES_DEBUG', 'Criando despesa', { 
        title: formData.title,
        amount: formData.amount,
        categoryId: formData.category_id,
        originalDate: formData.date
      });

      // Use consistent date handling utility function
      const dateISOLocal = dateInputToISO(formData.date);
      
      logger.info('EXPENSES_DEBUG', 'Correção de data aplicada', { 
        originalDate: formData.date,
        correctedDate: dateISOLocal 
      });

      // Buscar categoria para verificar se é fatura
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', formData.category_id)
        .single();

      const isInvoice = category && isInvoiceCategory(category.name);

      // Validar MM-AA se for categoria de fatura
      if (isInvoice) {
        if (!formData.invoice_month_year) {
          throw new Error('Mês/Ano é obrigatório para categorias de fatura');
        }

        if (!validateMonthYear(formData.invoice_month_year)) {
          throw new Error('Formato de Mês/Ano inválido. Use MM-AA (ex: 12-24)');
        }

        logger.info('EXPENSES_DEBUG', 'Processando despesa de fatura', {
          monthYear: formData.invoice_month_year,
          categoryName: category.name
        });
      }

      // Criar transação
      const transactionData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        date: dateISOLocal,
        category_id: normalizeOptionalUUID(formData.category_id),
        bank_id: normalizeOptionalUUID(formData.bank_id),
        card_id: normalizeOptionalUUID(formData.card_id),
        status: formData.status,
        payment_method: formData.payment_method || null,
        note: formData.note || null,
        kind: 'expense',
        user_id: user.id,
        tenant_id: tenantId,
        debt_special_category_id: normalizeOptionalUUID(formData.debt_special_category_id),
        goal_special_category_id: normalizeOptionalUUID(formData.goal_special_category_id),
      };

      const { data: newTransaction, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      logger.info('EXPENSES_DEBUG', 'Despesa criada com sucesso', { 
        transactionId: newTransaction.id,
        isInvoice 
      });

      // Se for pagamento de fatura, processar lógica especial
      if (isInvoice && category && formData.invoice_month_year) {
        const cardName = category.name.replace(' - Fatura', '');
        
        try {
          await processInvoicePayment(
            cardName,
            formData.invoice_month_year,
            parseFloat(formData.amount)
          );
          
          logger.info('EXPENSES_DEBUG', 'Fatura processada automaticamente', {
            cardName,
            monthYear: formData.invoice_month_year
          });
        } catch (invoiceError) {
          logger.error('EXPENSES_DEBUG', 'Erro ao processar fatura automaticamente', {
            error: invoiceError,
            cardName
          });
          // Não falhar a criação da despesa por erro no processamento da fatura
        }
      }

      toast({ 
        title: isInvoice ? "Fatura registrada com sucesso!" : "Despesa criada com sucesso!",
        description: isInvoice ? "Sistema de fatura atualizado automaticamente." : undefined
      });

      // Invalidar cache para atualizar dados na interface
      logger.info('EXPENSES_DEBUG', 'Limpando cache após criar despesa');
      clearQueryCache();

      return newTransaction;
    } catch (error: any) {
      logger.error('EXPENSES_DEBUG', 'Erro ao criar despesa', { 
        error: error.message,
        formData 
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, isInvoiceCategory, validateMonthYear, processInvoicePayment, toast]);

  // Atualizar despesa
  const updateExpense = useCallback(async (expenseId: string, formData: ExpenseFormData) => {
    if (!user || !tenantId) {
      throw new Error('Usuário ou tenant não encontrado');
    }

    setLoading(true);
    try {
      logger.info('EXPENSES_DEBUG', 'Atualizando despesa', { 
        expenseId,
        originalDate: formData.date 
      });

      // Use consistent date handling utility function
      const dateISOLocal = dateInputToISO(formData.date);
      
      logger.info('EXPENSES_DEBUG', 'Correção de data na atualização', { 
        originalDate: formData.date,
        correctedDate: dateISOLocal 
      });

      // Buscar categoria para verificar se é fatura
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', formData.category_id)
        .single();

      const isInvoice = category && isInvoiceCategory(category.name);

      // Validar MM-AA se for categoria de fatura
      if (isInvoice && formData.invoice_month_year) {
        if (!validateMonthYear(formData.invoice_month_year)) {
          throw new Error('Formato de Mês/Ano inválido. Use MM-AA (ex: 12-24)');
        }
      }

      const transactionData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        date: dateISOLocal,
        category_id: normalizeOptionalUUID(formData.category_id),
        bank_id: normalizeOptionalUUID(formData.bank_id),
        card_id: normalizeOptionalUUID(formData.card_id),
        status: formData.status,
        payment_method: formData.payment_method || null,
        note: formData.note || null,
        debt_special_category_id: normalizeOptionalUUID(formData.debt_special_category_id),
        goal_special_category_id: normalizeOptionalUUID(formData.goal_special_category_id),
      };

      const { data: updatedTransaction, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;

      logger.info('EXPENSES_DEBUG', 'Despesa atualizada com sucesso', { 
        expenseId,
        isInvoice 
      });

      toast({ title: "Despesa atualizada com sucesso!" });
      
      // Invalidar cache para atualizar dados na interface
      logger.info('EXPENSES_DEBUG', 'Limpando cache após atualizar despesa', { expenseId });
      clearQueryCache();
      
      return updatedTransaction;
    } catch (error: any) {
      logger.error('EXPENSES_DEBUG', 'Erro ao atualizar despesa', { error, expenseId });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, isInvoiceCategory, validateMonthYear, toast]);

  // Buscar categorias com filtro para faturas
  const fetchCategories = useCallback(async (): Promise<{
    categories: Category[];
    invoiceCategories: Category[];
  }> => {
    if (!tenantId) return { categories: [], invoiceCategories: [] };

    try {
      logger.debug('EXPENSES_DEBUG', 'Carregando categorias', { tenantId });

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji')
        .eq('tenant_id', tenantId)
        .eq('archived', false)
        .order('name');

      if (error) throw error;

      const categories = data || [];
      const invoiceCategories = categories.filter(cat => 
        isInvoiceCategory(cat.name)
      );

      logger.info('EXPENSES_DEBUG', 'Categorias carregadas', { 
        total: categories.length,
        invoiceCategories: invoiceCategories.length 
      });

      return { categories, invoiceCategories };
    } catch (error) {
      logger.error('EXPENSES_DEBUG', 'Erro ao carregar categorias', { error });
      return { categories: [], invoiceCategories: [] };
    }
  }, [tenantId, isInvoiceCategory]);

  return {
    loading,
    createExpense,
    updateExpense,
    fetchCategories,
    validateMonthYear,
    isInvoiceCategory,
    getValidMonthYearOptions,
  };
};