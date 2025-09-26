-- Adicionar campo debt_special_category_id para identificar transações de dívidas
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS debt_special_category_id UUID REFERENCES public.categories(id);

-- Adicionar campo goal_special_category_id para identificar transações de metas
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS goal_special_category_id UUID REFERENCES public.categories(id);

COMMENT ON COLUMN public.transactions.debt_special_category_id IS 'Categoria especial da dívida para identificação da transação';
COMMENT ON COLUMN public.transactions.goal_special_category_id IS 'Categoria especial da meta para identificação da transação';
