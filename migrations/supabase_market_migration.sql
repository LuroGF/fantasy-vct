
-- Update market_transactions type check to allow 'clause_paid'
ALTER TABLE market_transactions DROP CONSTRAINT IF EXISTS market_transactions_type_check;

ALTER TABLE market_transactions 
ADD CONSTRAINT market_transactions_type_check 
CHECK (type IN ('buy', 'sell', 'clause_paid'));
