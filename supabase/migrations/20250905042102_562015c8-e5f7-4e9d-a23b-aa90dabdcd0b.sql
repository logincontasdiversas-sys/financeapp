-- Adicionar colunas para controle de faturas nos cartões
ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS gastos_pendentes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS limite_disponivel NUMERIC DEFAULT 0;

-- Adicionar coluna para marcar transações como pagas
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;

-- Função para atualizar limite disponível dos cartões
CREATE OR REPLACE FUNCTION public.update_card_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Atualizar limite disponível baseado no limite total menos gastos pendentes
  UPDATE public.credit_cards
  SET limite_disponivel = limit_amount - COALESCE(gastos_pendentes, 0)
  WHERE id = COALESCE(NEW.card_id, OLD.card_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$

-- Trigger para atualizar limites quando transações mudarem
DROP TRIGGER IF EXISTS update_card_limits_trigger ON public.transactions;
CREATE TRIGGER update_card_limits_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_card_limits();

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_card_date ON public.transactions(card_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_paid ON public.transactions(paid) WHERE paid = true;
CREATE INDEX IF NOT EXISTS idx_categories_invoice ON public.categories(name) WHERE name LIKE '%Fatura%';