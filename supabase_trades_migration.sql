-- Create trade_offers table
CREATE TABLE IF NOT EXISTS trade_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_player_id UUID REFERENCES pro_players(id), -- Player the sender GIVES
  receiver_player_id UUID REFERENCES pro_players(id), -- Player the sender RECEIVES
  cash_offer NUMERIC DEFAULT 0, -- Money sender PAYS (positive) or RECEIVES (negative)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '48 hours')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trade_offers_league_id ON trade_offers(league_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_sender_id ON trade_offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_receiver_id ON trade_offers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);

-- RLS Policies (assuming RLS is enabled, but for now just definition)
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trades they are involved in" ON trade_offers
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create trades" ON trade_offers
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update trades they are involved in" ON trade_offers
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
