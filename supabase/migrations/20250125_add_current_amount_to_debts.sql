-- Add current_amount column to debts table
ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;

-- Add comment to the column
COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';
