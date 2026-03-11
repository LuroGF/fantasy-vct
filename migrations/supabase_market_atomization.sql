-- COMPLETE MARKET ATOMIZATION
-- UNIFIES BUYING, SELLING, BIDDING AND INVENTORY
-- =====================================================

-- 0. CREATE AUCTION ATOMIC
CREATE OR REPLACE FUNCTION handle_create_auction_atomic(
    p_league_id UUID,
    p_seller_id UUID,
    p_player_id UUID,
    p_starting_price BIGINT,
    p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_roster_entry RECORD;
    v_is_locked BOOLEAN;
BEGIN
    -- 1. Check ownership and Lock
    SELECT * INTO v_roster_entry FROM public.user_rosters 
    WHERE league_id = p_league_id AND profile_id = p_seller_id AND player_id = p_player_id FOR UPDATE;

    IF v_roster_entry IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'No posees a este agente.');
    END IF;

    -- 2. Check for existing active auction
    IF EXISTS (
        SELECT 1 FROM public.market_auctions 
        WHERE league_id = p_league_id AND seller_id = p_seller_id 
        AND player_id = p_player_id AND status = 'active'
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Ya tienes una subasta activa para este agente.');
    END IF;

    -- 3. Market Lock Check for Starters
    SELECT is_locked INTO v_is_locked FROM public.gameweeks WHERE is_active = true LIMIT 1;
    IF COALESCE(v_is_locked, false) AND v_roster_entry.slot_type = 'starter' THEN
        RETURN json_build_object('success', false, 'message', 'Los titulares no pueden subastarse durante la jornada.');
    END IF;

    -- 4. EXECUTE
    INSERT INTO public.market_auctions (
        league_id, seller_id, player_id, starting_price, 
        current_bid, expires_at, status
    ) VALUES (
        p_league_id, p_seller_id, p_player_id, p_starting_price,
        p_starting_price, p_expires_at, 'active'
    );

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;
-- UNIFIES BUYING, SELLING, BIDDING AND INVENTORY
-- =====================================================

-- 1. BASE BUY PLAYER (Used for both General and Personal Market)
CREATE OR REPLACE FUNCTION handle_buy_player(
    p_league_id UUID,
    p_profile_id UUID,
    p_player_id UUID,
    p_price BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_budget BIGINT;
    v_roster_count INT;
    v_role TEXT;
    v_role_count INT;
    v_is_locked BOOLEAN;
    v_starter_exists BOOLEAN;
    v_target_slot TEXT;
BEGIN
    -- 1. Lock Budget
    SELECT current_budget INTO v_budget FROM public.league_participants 
    WHERE league_id = p_league_id AND profile_id = p_profile_id FOR UPDATE;

    IF v_budget < p_price THEN
        RETURN json_build_object('success', false, 'message', 'Fondos insuficientes.');
    END IF;

    -- 2. Capacity Check (Max 10)
    SELECT count(*) INTO v_roster_count FROM public.user_rosters 
    WHERE league_id = p_league_id AND profile_id = p_profile_id;
    IF v_roster_count >= 10 THEN
        RETURN json_build_object('success', false, 'message', 'No tienes espacio en tu escuadra para más agentes.');
    END IF;

    -- 3. Role Check (Max 2 of same role, except Flex)
    SELECT role INTO v_role FROM public.pro_players WHERE id = p_player_id;
    IF v_role != 'Flex' THEN
        SELECT count(*) INTO v_role_count FROM public.user_rosters ur
        JOIN public.pro_players pp ON pp.id = ur.player_id
        WHERE ur.league_id = p_league_id AND ur.profile_id = p_profile_id AND pp.role = v_role;
        
        IF v_role_count >= 2 THEN
            RETURN json_build_object('success', false, 'message', 'Cupo de rol completo para ' || v_role || '. El máximo es 2 por posición.');
        END IF;
    END IF;

    -- 4. Market Lock Check & Determine Slot
    SELECT is_locked INTO v_is_locked FROM public.gameweeks WHERE is_active = true LIMIT 1;
    
    SELECT EXISTS (
        SELECT 1 FROM public.user_rosters ur
        JOIN public.pro_players pp ON pp.id = ur.player_id
        WHERE ur.league_id = p_league_id AND ur.profile_id = p_profile_id 
        AND pp.role = v_role AND ur.slot_type = 'starter'
    ) INTO v_starter_exists;

    v_target_slot := CASE WHEN (NOT COALESCE(v_is_locked, false) AND NOT v_starter_exists) THEN 'starter' ELSE 'substitute' END;

    -- 5. EXECUTE
    -- Deduct Budget
    UPDATE public.league_participants SET current_budget = current_budget - p_price 
    WHERE league_id = p_league_id AND profile_id = p_profile_id;

    -- Add to Roster
    INSERT INTO public.user_rosters (
        league_id, profile_id, player_id, acquisition_price, 
        release_clause, slot_type, is_starter, is_active
    ) VALUES (
        p_league_id, p_profile_id, p_player_id, p_price,
        floor(p_price * 1.5), v_target_slot, (v_target_slot = 'starter'), true
    );

    -- Log transaction
    INSERT INTO public.market_transactions (league_id, profile_id, player_id, type, price)
    VALUES (p_league_id, p_profile_id, p_player_id, 'buy', p_price);

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;

-- 2. BUY FROM PERSONAL MARKET
CREATE OR REPLACE FUNCTION handle_buy_from_personal_market(
    p_league_id UUID,
    p_profile_id UUID,
    p_player_id UUID,
    p_personal_market_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entry RECORD;
    v_buy_result JSON;
BEGIN
    -- 1. Lock and Check personal market entry
    SELECT * INTO v_entry FROM public.personal_market WHERE id = p_personal_market_id FOR UPDATE;
    IF v_entry IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Oferta no encontrada.');
    END IF;
    IF v_entry.is_purchased THEN
        RETURN json_build_object('success', false, 'message', 'Esta oferta ya fue procesada.');
    END IF;

    -- 2. Call standard buy player
    SELECT handle_buy_player(p_league_id, p_profile_id, p_player_id, v_entry.offer_price) INTO v_buy_result;

    -- 3. If successful, mark as purchased
    IF (v_buy_result->>'success')::boolean THEN
        UPDATE public.personal_market SET is_purchased = true WHERE id = p_personal_market_id;
    END IF;

    RETURN v_buy_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;

-- 3. SELL PLAYER (RE-IMPLEMENTED ATOMICALLY)
CREATE OR REPLACE FUNCTION handle_sell_player_atomic(
    p_league_id UUID,
    p_profile_id UUID,
    p_player_id UUID,
    p_price BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_roster_entry RECORD;
BEGIN
    -- 1. Lock roster entry
    SELECT * INTO v_roster_entry FROM public.user_rosters 
    WHERE league_id = p_league_id AND profile_id = p_profile_id AND player_id = p_player_id FOR UPDATE;

    IF v_roster_entry IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Agente no encontrado en tu escuadra.');
    END IF;

    -- 2. EXECUTE
    DELETE FROM public.user_rosters 
    WHERE league_id = p_league_id AND profile_id = p_profile_id AND player_id = p_player_id;

    UPDATE public.league_participants 
    SET current_budget = current_budget + p_price 
    WHERE league_id = p_league_id AND profile_id = p_profile_id;

    -- Log transaction
    INSERT INTO public.market_transactions (league_id, profile_id, player_id, type, price)
    VALUES (p_league_id, p_profile_id, p_player_id, 'sell', p_price);

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;

-- 4. PLACE BID ATOMIC
CREATE OR REPLACE FUNCTION handle_place_bid_atomic(
    p_auction_id UUID,
    p_profile_id UUID,
    p_bid_amount BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auction RECORD;
    v_budget BIGINT;
    v_committed_funds BIGINT;
    v_roster_count INT;
    v_role TEXT;
    v_role_count INT;
BEGIN
    -- 1. Lock Auction
    SELECT * INTO v_auction FROM public.market_auctions WHERE id = p_auction_id FOR UPDATE;
    IF v_auction IS NULL OR v_auction.status != 'active' THEN
        RETURN json_build_object('success', false, 'message', 'Subasta no disponible.');
    END IF;
    IF v_auction.seller_id = p_profile_id THEN
        RETURN json_build_object('success', false, 'message', 'No puedes pujar por tu propio agente.');
    END IF;

    -- 2. Lock Budget & Committed Funds
    SELECT current_budget INTO v_budget FROM public.league_participants 
    WHERE league_id = v_auction.league_id AND profile_id = p_profile_id FOR UPDATE;

    SELECT COALESCE(SUM(bid_amount), 0) INTO v_committed_funds
    FROM public.user_bids ub
    JOIN public.market_auctions ma ON ma.id = ub.auction_id
    WHERE ub.profile_id = p_profile_id 
      AND ma.league_id = v_auction.league_id 
      AND ma.status = 'active'
      AND ma.id != p_auction_id;

    IF (v_budget - v_committed_funds) < p_bid_amount THEN
        RETURN json_build_object('success', false, 'message', 'Fondos insuficientes (contando pujas activas).');
    END IF;

    -- 3. Capacity Checks
    SELECT count(*) INTO v_roster_count FROM public.user_rosters 
    WHERE league_id = v_auction.league_id AND profile_id = p_profile_id;
    
    IF v_roster_count >= 10 THEN
        RETURN json_build_object('success', false, 'message', 'Tu escuadra está completa. No puedes pujar por más agentes.');
    END IF;

    SELECT role INTO v_role FROM public.pro_players WHERE id = v_auction.player_id;
    IF v_role != 'Flex' THEN
        SELECT count(*) INTO v_role_count FROM public.user_rosters ur
        JOIN public.pro_players pp ON pp.id = ur.player_id
        WHERE ur.league_id = v_auction.league_id AND ur.profile_id = p_profile_id AND pp.role = v_role;

        IF v_role_count >= 2 THEN
            RETURN json_build_object('success', false, 'message', 'Ya tienes el máximo de agentes para el rol ' || v_role || '. Máximo 2 por posición.');
        END IF;
    END IF;

    -- 4. EXECUTE
    -- Update auction if bid is higher
    IF p_bid_amount > v_auction.current_bid THEN
        UPDATE public.market_auctions 
        SET current_bid = p_bid_amount, highest_bidder_id = p_profile_id 
        WHERE id = p_auction_id;
    END IF;

    -- Upsert personal bid
    INSERT INTO public.user_bids (auction_id, profile_id, bid_amount)
    VALUES (p_auction_id, p_profile_id, p_bid_amount)
    ON CONFLICT (auction_id, profile_id) DO UPDATE SET bid_amount = EXCLUDED.bid_amount;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;

-- 5. WITHDRAW BID ATOMIC
CREATE OR REPLACE FUNCTION handle_withdraw_bid_atomic(
    p_auction_id UUID,
    p_profile_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auction RECORD;
    v_next_bid RECORD;
BEGIN
    -- 1. Lock Auction
    SELECT * INTO v_auction FROM public.market_auctions WHERE id = p_auction_id FOR UPDATE;
    
    -- 2. Delete the bid
    DELETE FROM public.user_bids WHERE auction_id = p_auction_id AND profile_id = p_profile_id;

    -- 3. If the user was the leader, re-calculate next leader
    IF v_auction.highest_bidder_id = p_profile_id THEN
        SELECT profile_id, bid_amount INTO v_next_bid
        FROM public.user_bids
        WHERE auction_id = p_auction_id
        ORDER BY bid_amount DESC, created_at ASC
        LIMIT 1;

        IF v_next_bid IS NOT NULL THEN
            UPDATE public.market_auctions 
            SET current_bid = v_next_bid.bid_amount, highest_bidder_id = v_next_bid.profile_id
            WHERE id = p_auction_id;
        ELSE
            UPDATE public.market_auctions 
            SET current_bid = starting_price, highest_bidder_id = NULL
            WHERE id = p_auction_id;
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;

-- 6. REVEAL AUCTION ATOMIC
CREATE OR REPLACE FUNCTION handle_reveal_auction_atomic(
    p_auction_id UUID,
    p_profile_id UUID,
    p_spy_eye_type_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inventory_id UUID;
    v_quantity INT;
BEGIN
    -- 1. Check/Lock Inventory
    SELECT id, quantity INTO v_inventory_id, v_quantity 
    FROM public.user_inventory 
    WHERE profile_id = p_profile_id AND powerup_type_id = p_spy_eye_type_id 
    FOR UPDATE;

    IF v_inventory_id IS NULL OR v_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'No tienes el objeto Ojo del Espía.');
    END IF;

    -- 2. Check if already revealed
    IF EXISTS (SELECT 1 FROM public.auction_reveals WHERE auction_id = p_auction_id AND profile_id = p_profile_id) THEN
        RETURN json_build_object('success', false, 'message', 'Ya has revelado esta subasta.');
    END IF;

    -- 3. EXECUTE
    UPDATE public.user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    
    INSERT INTO public.auction_reveals (auction_id, profile_id) 
    VALUES (p_auction_id, p_profile_id);

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error interno del servidor base de datos.');
END;
$$;

-- 7. ACCEPT TRADE OFFER ATOMIC
CREATE OR REPLACE FUNCTION accept_trade_offer_atomic(
    p_offer_id UUID,
    p_receiver_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_sender_budget BIGINT;
    v_receiver_budget BIGINT;
    v_sender_roster_count INT;
    v_receiver_roster_count INT;
    v_sender_player_role TEXT;
    v_receiver_player_role TEXT;
BEGIN
    -- 1. Lock and Validate Offer
    SELECT * INTO v_offer FROM public.trade_offers WHERE id = p_offer_id FOR UPDATE;
    IF v_offer IS NULL OR v_offer.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Oferta no disponible.');
    END IF;
    IF v_offer.receiver_id != p_receiver_id THEN
        RETURN json_build_object('success', false, 'error', 'No eres el destinatario de esta oferta.');
    END IF;

    -- 2. Lock Participants
    SELECT current_budget INTO v_sender_budget FROM public.league_participants 
    WHERE league_id = v_offer.league_id AND profile_id = v_offer.sender_id FOR UPDATE;
    SELECT current_budget INTO v_receiver_budget FROM public.league_participants 
    WHERE league_id = v_offer.league_id AND profile_id = v_offer.receiver_id FOR UPDATE;

    -- 3. Check Budgets
    IF v_offer.cash_offer > 0 AND v_sender_budget < v_offer.cash_offer THEN
        RETURN json_build_object('success', false, 'error', 'El ofertante ya no tiene fondos suficientes.');
    END IF;
    IF v_offer.cash_offer < 0 AND v_receiver_budget < ABS(v_offer.cash_offer) THEN
        RETURN json_build_object('success', false, 'error', 'No tienes fondos suficientes para pagar.');
    END IF;

    -- 4. Execute Transfers
    -- Sender -> Receiver
    IF v_offer.sender_player_id IS NOT NULL THEN
        DELETE FROM public.user_rosters WHERE league_id = v_offer.league_id AND profile_id = v_offer.sender_id AND player_id = v_offer.sender_player_id;
        INSERT INTO public.user_rosters (league_id, profile_id, player_id, acquisition_price, slot_type, is_starter, is_active)
        VALUES (v_offer.league_id, v_offer.receiver_id, v_offer.sender_player_id, 0, 'substitute', false, true);
    END IF;

    -- Receiver -> Sender
    IF v_offer.receiver_player_id IS NOT NULL THEN
        DELETE FROM public.user_rosters WHERE league_id = v_offer.league_id AND profile_id = v_offer.receiver_id AND player_id = v_offer.receiver_player_id;
        INSERT INTO public.user_rosters (league_id, profile_id, player_id, acquisition_price, slot_type, is_starter, is_active)
        VALUES (v_offer.league_id, v_offer.sender_id, v_offer.receiver_player_id, 0, 'substitute', false, true);
    END IF;

    -- 5. Execute Cash Transfer
    IF v_offer.cash_offer != 0 THEN
        UPDATE public.league_participants SET current_budget = current_budget - v_offer.cash_offer WHERE league_id = v_offer.league_id AND profile_id = v_offer.sender_id;
        UPDATE public.league_participants SET current_budget = current_budget + v_offer.cash_offer WHERE league_id = v_offer.league_id AND profile_id = v_offer.receiver_id;
    END IF;

    -- 6. Log Transactions
    IF v_offer.sender_player_id IS NOT NULL OR v_offer.receiver_player_id IS NOT NULL THEN
        INSERT INTO public.market_transactions (league_id, profile_id, player_id, type, price)
        VALUES (v_offer.league_id, v_offer.sender_id, v_offer.sender_player_id, 'trade', ABS(v_offer.cash_offer));
    END IF;

    -- 7. Update Offer State
    UPDATE public.trade_offers SET status = 'accepted' WHERE id = p_offer_id;

    RETURN json_build_object('success', true, 'message', 'Intercambio completado.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Error al procesar el intercambio.');
END;
$$;
