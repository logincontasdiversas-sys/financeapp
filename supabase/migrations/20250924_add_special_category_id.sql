-- Adicionar coluna special_category_id na tabela debts
ALTER TABLE public.debts 
ADD COLUMN IF NOT EXISTS special_category_id UUID REFERENCES public.categories(id);

-- Adicionar coluna special_category_id na tabela goals
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS special_category_id UUID REFERENCES public.categories(id);

-- Adicionar comentários para documentar as colunas
COMMENT ON COLUMN public.debts.special_category_id IS 'Categoria especial criada automaticamente para a dívida';
COMMENT ON COLUMN public.goals.special_category_id IS 'Categoria especial criada automaticamente para a meta';
