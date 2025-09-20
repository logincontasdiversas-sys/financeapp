-- Add foreign key constraint for card_id in transactions table
ALTER TABLE public.transactions 
ADD CONSTRAINT fk_transactions_card_id 
FOREIGN KEY (card_id) REFERENCES public.credit_cards(id) 
ON DELETE SET NULL;