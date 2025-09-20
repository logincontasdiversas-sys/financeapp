-- Verificar e corrigir políticas RLS para a tabela transactions

-- Primeiro, remover políticas existentes se houver problemas
DROP POLICY IF EXISTS "tx_write_self" ON public.transactions;
DROP POLICY IF EXISTS "tx_read_if_member" ON public.transactions;

-- Criar política de leitura para transactions
CREATE POLICY "users_can_read_own_transactions" 
ON public.transactions 
FOR SELECT 
USING (user_id = auth.uid());

-- Criar política de inserção para transactions
CREATE POLICY "users_can_insert_own_transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Criar política de atualização para transactions
CREATE POLICY "users_can_update_own_transactions" 
ON public.transactions 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Criar política de exclusão para transactions
CREATE POLICY "users_can_delete_own_transactions" 
ON public.transactions 
FOR DELETE 
USING (user_id = auth.uid());

-- Garantir que RLS está habilitado
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Habilitar Realtime para a tabela transactions
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;