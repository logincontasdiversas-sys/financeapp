import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCardIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  brand: string;
  spent_amount?: number;
}

interface CreditCardsSectionProps {
  startDate?: Date;
  endDate?: Date;
}

export const CreditCardsSection = ({ startDate, endDate }: CreditCardsSectionProps) => {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Realtime sync para cartões
  useRealtimeSync({
    table: 'credit_cards',
    onInsert: () => {
      logger.info('CARDS_SECTION_REALTIME', 'Novo cartão detectado');
      loadCards();
    },
    onUpdate: () => {
      logger.info('CARDS_SECTION_REALTIME', 'Cartão atualizado detectado');
      loadCards();
    },
    onDelete: () => {
      logger.info('CARDS_SECTION_REALTIME', 'Cartão removido detectado');
      loadCards();
    },
  });

  // Realtime sync para transações (afeta gastos dos cartões)
  useRealtimeSync({
    table: 'transactions',
    onInsert: (payload) => {
      if (payload.new?.card_id) {
        logger.info('CARDS_SECTION_REALTIME', 'Nova transação de cartão detectada');
        loadCards();
      }
    },
    onUpdate: (payload) => {
      if (payload.new?.card_id || payload.old?.card_id) {
        logger.info('CARDS_SECTION_REALTIME', 'Transação de cartão atualizada detectada');
        loadCards();
      }
    },
    onDelete: (payload) => {
      if (payload.old?.card_id) {
        logger.info('CARDS_SECTION_REALTIME', 'Transação de cartão removida detectada');
        loadCards();
      }
    },
  });

  useEffect(() => {
    // Só tenta carregar quando tenantId está disponível
    if (tenantId && !tenantLoading) {
      loadCards();
    } else if (!tenantLoading && !tenantId) {
      // Se o tenant está carregado mas não há tenantId, não há cartões para mostrar
      setLoading(false);
    }
  }, [tenantId, tenantLoading, startDate, endDate]);

  const loadCards = async () => {
    if (!tenantId) {
      console.log('[CARDS_SECTION_DEBUG] No tenantId available, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[CARDS_SECTION_DEBUG] Loading cards for tenant', { tenantId });
      
      // Filtrar por tenant_id como o hook useSupabaseCards faz
      const { data: cardsData, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (cardsError) throw cardsError;

      console.log('[CARDS_SECTION_DEBUG] Cards loaded', { 
        count: cardsData?.length || 0,
        tenantId 
      });

      // Usar datas do filtro ou mês atual
      let startDateStr: string;
      let endDateStr: string;
      
      if (startDate && endDate) {
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
        console.log('[CARDS_SECTION_DEBUG] Usando período filtrado:', { startDateStr, endDateStr });
      } else {
        // Get current month expenses for each card
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startDateStr = startOfMonth.toISOString().split('T')[0];
        
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endDateStr = endOfMonth.toISOString().split('T')[0];
        console.log('[CARDS_SECTION_DEBUG] Usando mês atual:', { startDateStr, endDateStr });
      }

      const cardsWithSpent = await Promise.all(
        (cardsData || []).map(async (card) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('card_id', card.id)
            .eq('kind', 'expense')
            .gte('date', startDateStr)
            .lte('date', endDateStr);

          const spent_amount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          
          return {
            ...card,
            spent_amount
          };
        })
      );

      setCards(cardsWithSpent);
    } catch (error) {
      logger.error('CARDS_SECTION', 'Error loading cards', { error, tenantId });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const totalLimit = cards.reduce((sum, card) => sum + (card.limit_amount || 0), 0);
  const totalSpent = cards.reduce((sum, card) => sum + (card.spent_amount || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cartões de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div className="h-4 w-24 bg-muted-foreground/20 rounded"></div>
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5" />
          Cartões de Crédito
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Usado: {formatCurrency(totalSpent)} / {formatCurrency(totalLimit)}
        </div>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum cartão cadastrado
          </p>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const availableLimit = (card.limit_amount || 0) - (card.spent_amount || 0);
              const usagePercentage = ((card.spent_amount || 0) / (card.limit_amount || 1)) * 100;
              
              return (
                <div key={card.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-sm text-muted-foreground">{card.brand}</p>
                    <div className="mt-1 bg-gray-200 rounded-full h-2 w-32">
                      <div 
                        className={`h-2 rounded-full ${usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {formatCurrency(card.spent_amount || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Disponível: {formatCurrency(availableLimit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};