-- Migração para atualizar metas e dívidas existentes
-- Esta migração permite que metas e dívidas existentes sejam atualizadas com categorias

-- 1. Criar uma categoria padrão "Metas" se não existir
INSERT INTO public.categories (name, emoji, tenant_id, archived, is_system)
SELECT 'Metas', '🎯', t.id, false, true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.name = 'Metas' AND c.tenant_id = t.id
);

-- 2. Criar uma categoria padrão "Dívidas" se não existir
INSERT INTO public.categories (name, emoji, tenant_id, archived, is_system)
SELECT 'Dívidas', '💳', t.id, false, true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.name = 'Dívidas' AND c.tenant_id = t.id
);

-- 3. Atualizar metas existentes que não têm categoria
-- Assumir categoria "Metas" como padrão
UPDATE public.goals 
SET category_id = (
  SELECT c.id 
  FROM public.categories c 
  WHERE c.name = 'Metas' 
  AND c.tenant_id = goals.tenant_id
  LIMIT 1
)
WHERE category_id IS NULL;

-- 4. Atualizar dívidas existentes que não têm categoria
-- Assumir categoria "Dívidas" como padrão
UPDATE public.debts 
SET category_id = (
  SELECT c.id 
  FROM public.categories c 
  WHERE c.name = 'Dívidas' 
  AND c.tenant_id = debts.tenant_id
  LIMIT 1
)
WHERE category_id IS NULL;

-- Comentário: As metas e dívidas existentes agora têm categorias padrão
-- Os usuários podem editar individualmente para escolher categorias mais específicas
