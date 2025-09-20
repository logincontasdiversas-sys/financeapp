-- Adicionar campo is_system para identificar categorias automáticas criadas por metas e dívidas
ALTER TABLE public.categories ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Atualizar categorias existentes que são de sistema (metas e dívidas)
UPDATE public.categories 
SET is_system = true 
WHERE name LIKE '[Meta] - %' OR name LIKE '[Dívida] - %';