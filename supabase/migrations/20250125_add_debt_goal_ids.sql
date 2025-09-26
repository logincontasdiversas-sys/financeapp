-- Adicionar campos debt_id e goal_id para vincular transações diretamente às dívidas/metas
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id);

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id);

-- Adicionar comentários para documentar as colunas
COMMENT ON COLUMN public.transactions.debt_id IS 'ID da dívida para vincular transação de pagamento específico';
COMMENT ON COLUMN public.transactions.goal_id IS 'ID da meta para vincular transação de contribuição específica';
