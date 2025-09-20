-- Criar tabela debts
CREATE TABLE IF NOT EXISTS public.debts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) NOT NULL DEFAULT 0,
    due_date date,
    monthly_interest numeric(5,2) NOT NULL DEFAULT 0,
    settled boolean NOT NULL DEFAULT false,
    image_url text,
    category_id uuid,
    observations text,
    is_concluded boolean NOT NULL DEFAULT false,
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Adicionar foreign keys
ALTER TABLE public.debts 
ADD CONSTRAINT fk_debts_category 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.debts 
ADD CONSTRAINT fk_debts_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Habilitar RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own debts" ON public.debts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts" ON public.debts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" ON public.debts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" ON public.debts
    FOR DELETE USING (auth.uid() = user_id);