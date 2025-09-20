-- Remove the duplicate foreign key constraint that's causing issues
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_card_id_fkey;

-- Add current balance tracking to credit cards
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS available_limit NUMERIC GENERATED ALWAYS AS (limit_amount - current_balance) STORED;