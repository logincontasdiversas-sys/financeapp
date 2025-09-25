-- Criar categorias principais para Metas e Dívidas
-- Esta migração cria as categorias principais que serão usadas como base

-- Inserir categoria principal para Metas (se não existir)
INSERT INTO public.categories (name, emoji, tenant_id, archived)
SELECT 'Metas', '🎯', t.id, false
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.name = 'Metas' AND c.tenant_id = t.id
);

-- Inserir categoria principal para Dívidas (se não existir)
INSERT INTO public.categories (name, emoji, tenant_id, archived)
SELECT 'Dívidas', '💳', t.id, false
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.name = 'Dívidas' AND c.tenant_id = t.id
);

-- Comentário: As subcategorias personalizadas serão criadas automaticamente
-- quando o usuário fizer pagamentos de metas/dívidas específicas
