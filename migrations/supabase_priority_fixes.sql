-- =====================================================
-- PRIORITY FIXES: ATOMIC TRANSACTIONS & DATA INTEGRITY
-- =====================================================

-- 1. Improved Clause Payment with Powerup Check
CREATE OR REPLACE FUNCTION handle_pay_clause(
    p_league_id UUID,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_player_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_budget BIGINT;
    v_seller_budget BIGINT;
    v_roster_entry RECORD;
    v_clause_price BIGINT;
    v_market_value BIGINT;
    v_lock_active BOOLEAN;
    v_active_gw_id INT;
BEGIN
    -- 1. Get active gameweek
    SELECT id INTO v_active_gw_id FROM public.gameweeks WHERE is_active = true LIMIT 1;
    
    -- 2. Check for "Protocolo de Bloqueo" (LOCK) powerup
    SELECT EXISTS (
        SELECT 1 FROM public.active_powerups 
        WHERE league_id = p_league_id 
        AND target_player_id = p_player_id 
        AND gameweek_id = v_active_gw_id
    ) INTO v_lock_active;

    IF v_lock_active THEN
        RETURN json_build_object('success', false, 'message', 'El agente tiene un Protocolo de Bloqueo activo.');
    END IF;

    -- 3. Get roster entry and market value
    SELECT ur.*, pp.market_value INTO v_roster_entry
    FROM public.user_rosters ur
    JOIN public.pro_players pp ON pp.id = ur.player_id
    WHERE ur.league_id = p_league_id 
      AND ur.profile_id = p_seller_id 
      AND ur.player_id = p_player_id
    FOR UPDATE;

    IF v_roster_entry IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El agente ya no pertenece a ese rival.');
    END IF;

    -- 4. Calculate clause price (same logic as TS: max(release_clause, market_value * 1.25))
    v_market_value := v_roster_entry.market_value;
    v_clause_price := GREATEST(COALESCE(v_roster_entry.release_clause, 0), floor(v_market_value * 1.25));

    -- 5. Check buyer budget
    SELECT current_budget INTO v_buyer_budget
    FROM public.league_participants
    WHERE league_id = p_league_id AND profile_id = p_buyer_id
    FOR UPDATE;

    IF v_buyer_budget < v_clause_price THEN
        RETURN json_build_object('success', false, 'message', 'Recursos insuficientes.');
    END IF;

    -- 6. Check Capacity (Max 10)
    IF (SELECT count(*) FROM public.user_rosters WHERE league_id = p_league_id AND profile_id = p_buyer_id) >= 10 THEN
        RETURN json_build_object('success', false, 'message', 'No tienes espacio en tu escuadra para más contratos.');
    END IF;

    -- 7. EXECUTE TRANSACTION
    -- Deduct buyer
    UPDATE public.league_participants 
    SET current_budget = current_budget - v_clause_price 
    WHERE league_id = p_league_id AND profile_id = p_buyer_id;

    -- Add seller
    UPDATE public.league_participants 
    SET current_budget = current_budget + v_clause_price 
    WHERE league_id = p_league_id AND profile_id = p_seller_id;

    -- Transfer Roster Entry
    -- We delete and insert to refresh all metadata and satisfy the unique constraint easily
    DELETE FROM public.user_rosters 
    WHERE league_id = p_league_id AND player_id = p_player_id AND profile_id = p_seller_id;

    INSERT INTO public.user_rosters (
        league_id, profile_id, player_id, acquisition_price, 
        release_clause, slot_type, is_starter, is_active
    ) VALUES (
        p_league_id, p_buyer_id, p_player_id, v_clause_price,
        floor(v_clause_price * 1.5), 'substitute', false, true
    );

    -- Log transaction
    INSERT INTO public.market_transactions (league_id, profile_id, player_id, type, price)
    VALUES (p_league_id, p_buyer_id, p_player_id, 'clause_paid', v_clause_price);

    RETURN json_build_object('success', true, 'price', v_clause_price);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. Atomic Auction Resolution Step
-- Processes a single auction winner safely
CREATE OR REPLACE FUNCTION handle_resolve_auction_winner(
    p_auction_id UUID,
    p_winner_id UUID,
    p_bid_amount BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auction RECORD;
    v_seller_budget BIGINT;
    v_winner_budget BIGINT;
    v_roster_count INT;
    v_role TEXT;
    v_role_count INT;
    v_starter_exists BOOLEAN;
    v_target_slot TEXT;
    v_is_locked BOOLEAN;
BEGIN
    -- 1. Lock Auction
    SELECT * INTO v_auction FROM public.market_auctions WHERE id = p_auction_id FOR UPDATE;
    IF v_auction.status != 'active' THEN
        RETURN json_build_object('success', false, 'message', 'Subasta ya procesada.');
    END IF;

    -- 2. Lock Winner Budget
    SELECT current_budget INTO v_winner_budget FROM public.league_participants 
    WHERE league_id = v_auction.league_id AND profile_id = p_winner_id FOR UPDATE;
    
    IF v_winner_budget < p_bid_amount THEN
        RETURN json_build_object('success', false, 'message', 'Fondos insuficientes.');
    END IF;

    -- 3. Capacity Check
    SELECT count(*) INTO v_roster_count FROM public.user_rosters 
    WHERE league_id = v_auction.league_id AND profile_id = p_winner_id;
    IF v_roster_count >= 10 THEN
        RETURN json_build_object('success', false, 'message', 'Squad completo.');
    END IF;

    -- 4. Role Check
    SELECT role INTO v_role FROM public.pro_players WHERE id = v_auction.player_id;
    SELECT count(*) INTO v_role_count FROM public.user_rosters ur
    JOIN public.pro_players pp ON pp.id = ur.player_id
    WHERE ur.league_id = v_auction.league_id AND ur.profile_id = p_winner_id AND pp.role = v_role;
    
    IF v_role_count >= 2 THEN
        RETURN json_build_object('success', false, 'message', 'Cupo de rol completo.');
    END IF;

    -- 5. Market Lock Check (Simplified for DB)
    SELECT is_locked INTO v_is_locked FROM public.gameweeks WHERE is_active = true LIMIT 1;
    
    SELECT EXISTS (
        SELECT 1 FROM public.user_rosters ur
        JOIN public.pro_players pp ON pp.id = ur.player_id
        WHERE ur.league_id = v_auction.league_id AND ur.profile_id = p_winner_id 
        AND pp.role = v_role AND ur.slot_type = 'starter'
    ) INTO v_starter_exists;

    v_target_slot := CASE WHEN (NOT COALESCE(v_is_locked, false) AND NOT v_starter_exists) THEN 'starter' ELSE 'substitute' END;

    -- 6. EXECUTE TRANSFER
    -- Deduct Winner
    UPDATE public.league_participants SET current_budget = current_budget - p_bid_amount 
    WHERE league_id = v_auction.league_id AND profile_id = p_winner_id;

    -- Add Seller
    UPDATE public.league_participants SET current_budget = current_budget + p_bid_amount 
    WHERE league_id = v_auction.league_id AND profile_id = v_auction.seller_id;

    -- Update Auction
    UPDATE public.market_auctions SET status = 'sold' WHERE id = p_auction_id;

    -- Transfer Player
    DELETE FROM public.user_rosters WHERE league_id = v_auction.league_id AND profile_id = v_auction.seller_id AND player_id = v_auction.player_id;
    
    INSERT INTO public.user_rosters (
        league_id, profile_id, player_id, acquisition_price, 
        release_clause, slot_type, is_starter, is_active
    ) VALUES (
        v_auction.league_id, p_winner_id, v_auction.player_id, p_bid_amount,
        floor(p_bid_amount * 1.5), v_target_slot, (v_target_slot = 'starter'), true
    );

    -- Log transaction
    INSERT INTO public.market_transactions (league_id, profile_id, player_id, type, price)
    VALUES (v_auction.league_id, p_winner_id, v_auction.player_id, 'buy', p_bid_amount);

    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
