import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from './useStableAuth';
import { useTenant } from './useTenant';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';
import { clearQueryCache } from './useSupabaseQuery';

interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  current_balance: number;
  available_limit: number;
  brand: string;
  closing_day: number | null;
  due_day: number | null;
  created_at: string;
}

interface CardFormData {
  name: string;
  limit: string;
  brand: string;
  closing_day: string;
  due_day: string;
}

export const useSupabaseCards = () => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Criar categoria de fatura automaticamente
  const createInvoiceCategory = useCallback(async (cardName: string) => {
    if (!tenantId || !user) return null;

    try {
      const categoryName = `${cardName} - Fatura`;
      logger.info('CARDS_DEBUG', 'Creating invoice category', { categoryName, cardName });

      // Verificar se categoria já existe
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .eq('tenant_id', tenantId)
        .single();

      if (existingCategory) {
        logger.debug('CARDS_DEBUG', 'Invoice category already exists', { 
          categoryId: existingCategory.id 
        });
        return existingCategory.id;
      }

      // Criar nova categoria
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          name: categoryName,
          emoji: '💳',
          tenant_id: tenantId,
          archived: false
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('CARDS_DEBUG', 'Categoria de fatura criada com sucesso', {
        categoryId: newCategory.id,
        categoryName: newCategory.name
      });

      return newCategory.id;
    } catch (error) {
      logger.error('CARDS_DEBUG', 'Erro ao criar categoria de fatura', { 
        error, 
        cardName 
      });
      return null;
    }
  }, [tenantId, user]);

  // Criar cartão com categoria de fatura
  const createCard = useCallback(async (formData: CardFormData) => {
    if (!user || !tenantId) {
      throw new Error('Usuário ou tenant não encontrado');
    }

    setLoading(true);
    try {
      logger.info('CARDS_DEBUG', 'Iniciando criação de cartão', { 
        cardName: formData.name,
        tenantId 
      });

      // Criar cartão
      const cardData = {
        name: formData.name,
        limit_amount: parseFloat(formData.limit),
        brand: formData.brand,
        closing_day: formData.closing_day ? parseInt(formData.closing_day) : null,
        due_day: formData.due_day ? parseInt(formData.due_day) : null,
        tenant_id: tenantId,
      };

      const { data: newCard, error: cardError } = await supabase
        .from('credit_cards')
        .insert(cardData)
        .select()
        .single();

      if (cardError) throw cardError;

      logger.info('CARDS_DEBUG', 'Cartão criado com sucesso', { 
        cardId: newCard.id,
        cardName: newCard.name 
      });

      // Criar categoria de fatura automaticamente
      const categoryId = await createInvoiceCategory(formData.name);
      
      if (categoryId) {
        logger.info('CARDS_DEBUG', 'Sistema de fatura configurado', {
          cardId: newCard.id,
          categoryId
        });

        toast({
          title: "Cartão criado com sucesso!",
          description: `Categoria "${formData.name} - Fatura" criada automaticamente.`,
        });
      } else {
        toast({
          title: "Cartão criado com sucesso!",
          description: "Atenção: categoria de fatura não foi criada.",
        });
      }

      // Invalidar cache para atualizar dados na interface
      clearQueryCache();

      return newCard;
    } catch (error: any) {
      logger.error('CARDS_DEBUG', 'Erro ao criar cartão', { 
        error: error.message,
        formData 
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, createInvoiceCategory, toast]);

  // Atualizar cartão
  const updateCard = useCallback(async (cardId: string, formData: CardFormData) => {
    if (!user || !tenantId) {
      throw new Error('Usuário ou tenant não encontrado');
    }

    setLoading(true);
    try {
      logger.info('CARDS_DEBUG', 'Atualizando cartão', { cardId });

      const cardData = {
        name: formData.name,
        limit_amount: parseFloat(formData.limit),
        brand: formData.brand,
        closing_day: formData.closing_day ? parseInt(formData.closing_day) : null,
        due_day: formData.due_day ? parseInt(formData.due_day) : null,
      };

      const { data: updatedCard, error } = await supabase
        .from('credit_cards')
        .update(cardData)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      logger.info('CARDS_DEBUG', 'Cartão atualizado com sucesso', { 
        cardId,
        cardName: updatedCard.name 
      });

      toast({ title: "Cartão atualizado com sucesso!" });
      
      // Invalidar cache para atualizar dados na interface
      clearQueryCache();
      
      return updatedCard;
    } catch (error: any) {
      logger.error('CARDS_DEBUG', 'Erro ao atualizar cartão', { error, cardId });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, tenantId, toast]);

  // Deletar cartão e sua categoria de fatura
  const deleteCard = useCallback(async (cardId: string, cardName: string) => {
    if (!confirm("Tem certeza que deseja excluir este cartão?")) return false;

    setLoading(true);
    try {
      logger.info('CARDS_DEBUG', 'Deletando cartão', { cardId, cardName });

      // Deletar cartão
      const { error: cardError } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', cardId);

      if (cardError) throw cardError;

      // Tentar deletar categoria de fatura (se existir e não tiver transações)
      const categoryName = `${cardName} - Fatura Total`;
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .eq('tenant_id', tenantId)
        .single();

      if (category) {
        // Verificar se há transações usando essa categoria
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id')
          .eq('category_id', category.id)
          .limit(1);

        if (!transactions || transactions.length === 0) {
          await supabase
            .from('categories')
            .delete()
            .eq('id', category.id);

          logger.info('CARDS_DEBUG', 'Categoria de fatura removida', { 
            categoryName 
          });
        } else {
          // Apenas arquivar a categoria se há transações
          await supabase
            .from('categories')
            .update({ archived: true })
            .eq('id', category.id);

          logger.info('CARDS_DEBUG', 'Categoria de fatura arquivada', { 
            categoryName 
          });
        }
      }

      toast({ title: "Cartão excluído com sucesso!" });
      
      // Invalidar cache para atualizar dados na interface
      clearQueryCache();
      
      return true;
    } catch (error: any) {
      logger.error('CARDS_DEBUG', 'Erro ao deletar cartão', { error, cardId });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Buscar cartões
  const fetchCards = useCallback(async (): Promise<CreditCard[]> => {
    console.log('[CARDS_HOOK_DEBUG] fetchCards called', { tenantId, user: !!user });
    
    if (!tenantId) {
      console.log('[CARDS_HOOK_DEBUG] No tenantId, returning empty array');
      return [];
    }

    if (!user) {
      console.log('[CARDS_HOOK_DEBUG] No user, returning empty array');
      return [];
    }

    try {
      console.log('[CARDS_HOOK_DEBUG] Making supabase query', { tenantId });
      logger.debug('CARDS_DEBUG', 'Carregando cartões', { tenantId });

      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      console.log('[CARDS_HOOK_DEBUG] Supabase response', { 
        data, 
        error, 
        tenantId,
        dataLength: data?.length,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('[CARDS_HOOK_DEBUG] Supabase error', error);
        throw error;
      }

      const result = data || [];
      console.log('[CARDS_HOOK_DEBUG] Cards loaded successfully', { 
        count: result.length, 
        cardNames: result.map(c => c.name),
        timestamp: new Date().toISOString()
      });
      logger.info('CARDS_DEBUG', 'Cartões carregados', { count: result.length });
      return result;
    } catch (error) {
      console.error('[CARDS_HOOK_DEBUG] Error in fetchCards', error);
      logger.error('CARDS_DEBUG', 'Erro ao carregar cartões', { error });
      return [];
    }
  }, [tenantId, user]);

  // Processar pagamento de fatura
  const processInvoicePayment = useCallback(async (
    cardName: string,
    monthYear: string,
    amount: number
  ) => {
    if (!tenantId || !user) return false;

    setLoading(true);
    try {
      logger.info('CARDS_DEBUG', 'Processando pagamento de fatura', {
        cardName,
        monthYear,
        amount
      });

      // Encontrar o cartão
      const { data: card } = await supabase
        .from('credit_cards')
        .select('id, limit_amount')
        .eq('name', cardName)
        .eq('tenant_id', tenantId)
        .single();

      if (!card) {
        throw new Error('Cartão não encontrado');
      }

      // Atualizar cartão: zerar gastos pendentes
      const { error: updateError } = await supabase
        .from('credit_cards')
        .update({
          // Note: Essas colunas precisariam ser adicionadas à tabela
          // gastos_pendentes: 0,
          // limite_disponivel: card.limit_amount
        })
        .eq('id', card.id);

      // Marcar transações do período como pagas
      const [year, month] = monthYear.split('-');
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;

      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'settled',
          // paid: true // Esta coluna precisaria ser adicionada
        })
        .eq('card_id', card.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (updateError || transactionError) {
        throw updateError || transactionError;
      }

      logger.info('CARDS_DEBUG', 'Pagamento de fatura processado com sucesso', {
        cardId: card.id,
        monthYear
      });

      toast({
        title: "Fatura paga com sucesso!",
        description: `Transações de ${monthYear} marcadas como pagas.`,
      });

      // Invalidar cache para atualizar dados na interface
      clearQueryCache();

      return true;
    } catch (error: any) {
      logger.error('CARDS_DEBUG', 'Erro ao processar pagamento de fatura', { 
        error,
        cardName,
        monthYear 
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, toast]);

  return {
    loading,
    createCard,
    updateCard,
    deleteCard,
    fetchCards,
    processInvoicePayment,
    createInvoiceCategory,
  };
};