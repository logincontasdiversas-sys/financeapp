-- Create function to update credit card balance based on transactions
CREATE OR REPLACE FUNCTION public.update_card_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update card balance for the affected card
  IF TG_OP = 'DELETE' THEN
    -- For delete operations, use OLD
    IF OLD.card_id IS NOT NULL THEN
      UPDATE public.credit_cards 
      SET current_balance = COALESCE((
        SELECT SUM(amount) 
        FROM public.transactions 
        WHERE card_id = OLD.card_id 
          AND kind = 'expense' 
          AND status = 'settled'
      ), 0)
      WHERE id = OLD.card_id;
    END IF;
    RETURN OLD;
  ELSE
    -- For insert/update operations, use NEW
    IF NEW.card_id IS NOT NULL THEN
      UPDATE public.credit_cards 
      SET current_balance = COALESCE((
        SELECT SUM(amount) 
        FROM public.transactions 
        WHERE card_id = NEW.card_id 
          AND kind = 'expense' 
          AND status = 'settled'
      ), 0)
      WHERE id = NEW.card_id;
    END IF;
    
    -- Also update OLD card if card_id changed (for updates)
    IF TG_OP = 'UPDATE' AND OLD.card_id IS NOT NULL AND OLD.card_id != NEW.card_id THEN
      UPDATE public.credit_cards 
      SET current_balance = COALESCE((
        SELECT SUM(amount) 
        FROM public.transactions 
        WHERE card_id = OLD.card_id 
          AND kind = 'expense' 
          AND status = 'settled'
      ), 0)
      WHERE id = OLD.card_id;
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to automatically update card balances
DROP TRIGGER IF EXISTS trigger_update_card_balance ON public.transactions;
CREATE TRIGGER trigger_update_card_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW 
  WHEN (
    (TG_OP = 'DELETE' AND OLD.card_id IS NOT NULL) OR
    (TG_OP != 'DELETE' AND NEW.card_id IS NOT NULL) OR
    (TG_OP = 'UPDATE' AND (OLD.card_id IS NOT NULL OR NEW.card_id IS NOT NULL))
  )
  EXECUTE FUNCTION public.update_card_balance();