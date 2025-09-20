-- Remover todas as políticas antigas de transactions
DROP POLICY IF EXISTS "tx_write_self" ON public.transactions;
DROP POLICY IF EXISTS "tx_read_if_member" ON public.transactions;

-- Criar políticas corretas baseadas em user_id
CREATE POLICY "transactions_select_own" ON public.transactions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "transactions_insert_own" ON public.transactions  
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_update_own" ON public.transactions
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_delete_own" ON public.transactions
FOR DELETE USING (user_id = auth.uid());