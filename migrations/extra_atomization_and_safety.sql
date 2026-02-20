-- Migration: Reward Protection & Extra Atomization

-- 1. Prevent double rewards for gameweeks
ALTER TABLE public.participant_scores_history ADD COLUMN IF NOT EXISTS rewarded boolean DEFAULT false;

-- 2. Atomic Power-up Purchase
CREATE OR REPLACE FUNCTION handle_buy_powerup(
    p_league_id UUID,
    p_profile_id UUID,
    p_powerup_type_id UUID,
    p_price BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_total_points BIGINT;
BEGIN
    -- Check budget (points)
    SELECT total_points INTO v_current_total_points
    FROM public.league_participants
    WHERE league_id = p_league_id AND profile_id = p_profile_id
    FOR UPDATE;

    IF v_current_total_points < p_price THEN
        RETURN json_build_object('success', false, 'message', 'Puntos insuficientes.');
    END IF;

    -- Deduct points
    UPDATE public.league_participants
    SET total_points = v_current_total_points - p_price
    WHERE league_id = p_league_id AND profile_id = p_profile_id;

    -- Add to inventory
    INSERT INTO public.user_inventory (league_id, profile_id, powerup_type_id, quantity)
    VALUES (p_league_id, p_profile_id, p_powerup_type_id, 1)
    ON CONFLICT (league_id, profile_id, powerup_type_id)
    DO UPDATE SET quantity = user_inventory.quantity + 1;

    -- Record transaction
    INSERT INTO public.market_transactions (league_id, profile_id, type, price)
    VALUES (p_league_id, p_profile_id, 'buy_item', p_price);

    RETURN json_build_object('success', true);
END;
$$;

-- 3. Atomic Roster Slot Update (Starter/Bench)
CREATE OR REPLACE FUNCTION handle_set_starter_status(
    p_league_id UUID,
    p_profile_id UUID,
    p_player_id UUID,
    p_new_slot TEXT -- 'starter' or 'substitute'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player_role TEXT;
    v_current_slot TEXT;
    v_conflicting_player_id UUID;
    v_role_count INTEGER;
BEGIN
    -- 1. Get player role and current slot
    SELECT role INTO v_player_role FROM public.pro_players WHERE id = p_player_id;
    SELECT slot_type INTO v_current_slot FROM public.user_rosters 
    WHERE league_id = p_league_id AND profile_id = p_profile_id AND player_id = p_player_id;

    IF v_current_slot = p_new_slot THEN
        RETURN json_build_object('success', true, 'message', 'Ya está en ese puesto.');
    END IF;

    -- 2. Check for Role conflict in target slot
    -- (We only allow ONE of each role in starters)
    IF p_new_slot = 'starter' THEN
        SELECT player_id INTO v_conflicting_player_id
        FROM public.user_rosters ur
        JOIN public.pro_players pp ON ur.player_id = pp.id
        WHERE ur.league_id = p_league_id 
          AND ur.profile_id = p_profile_id 
          AND ur.slot_type = 'starter'
          AND pp.role = v_player_role;

        IF v_conflicting_player_id IS NOT NULL THEN
            -- SWAP: Move conflicting to substitute
            UPDATE public.user_rosters
            SET slot_type = 'substitute', is_starter = false
            WHERE league_id = p_league_id AND profile_id = p_profile_id AND player_id = v_conflicting_player_id;
        END IF;

        -- Check total starters count (max 5)
        SELECT COUNT(*) INTO v_role_count FROM public.user_rosters 
        WHERE league_id = p_league_id AND profile_id = p_profile_id AND slot_type = 'starter';
        
        IF v_role_count >= 5 AND v_conflicting_player_id IS NULL THEN
            RETURN json_build_object('success', false, 'message', 'Ya tienes 5 titulares.');
        END IF;
    END IF;

    -- 3. Update slot
    UPDATE public.user_rosters
    SET slot_type = p_new_slot, is_starter = (p_new_slot = 'starter')
    WHERE league_id = p_league_id AND profile_id = p_profile_id AND player_id = p_player_id;

    RETURN json_build_object('success', true, 'role', v_player_role);
END;
$$;

-- 4. Atomic Trade Offer Creation
CREATE OR REPLACE FUNCTION handle_create_trade_offer(
    p_league_id UUID,
    p_sender_id UUID,
    p_receiver_id UUID,
    p_sender_player_id UUID,
    p_receiver_player_id UUID,
    p_cash_offer BIGINT -- Positive: Sender pays, Negative: Receiver pays
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_owns BOOLEAN;
    v_receiver_owns BOOLEAN;
    v_budget BIGINT;
    v_committed BIGINT;
BEGIN
    -- 1. Validate Ownership
    IF p_sender_player_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.user_rosters WHERE league_id = p_league_id AND profile_id = p_sender_id AND player_id = p_sender_player_id AND is_active = true) INTO v_sender_owns;
        IF NOT v_sender_owns THEN RETURN json_build_object('success', false, 'message', 'No posees el agente que ofreces.'); END IF;
    END IF;

    IF p_receiver_player_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.user_rosters WHERE league_id = p_league_id AND profile_id = p_receiver_id AND player_id = p_receiver_player_id AND is_active = true) INTO v_receiver_owns;
        IF NOT v_receiver_owns THEN RETURN json_build_object('success', false, 'message', 'El destinatario no posee el agente solicitado.'); END IF;
    END IF;

    -- 2. Validate Budget (the one who pays)
    IF p_cash_offer > 0 THEN
        -- Sender pays
        SELECT current_budget INTO v_budget FROM public.league_participants WHERE league_id = p_league_id AND profile_id = p_sender_id;
        SELECT COALESCE(SUM(bid_amount), 0) INTO v_committed FROM public.user_bids ub JOIN public.market_auctions ma ON ub.auction_id = ma.id WHERE ub.profile_id = p_sender_id AND ma.status = 'active';
        
        IF (v_budget - v_committed) < p_cash_offer THEN
            RETURN json_build_object('success', false, 'message', 'Fondos insuficientes (tienes compromisos en subastas).');
        END IF;
    ELSIF p_cash_offer < 0 THEN
        -- Receiver pays
        SELECT current_budget INTO v_budget FROM public.league_participants WHERE league_id = p_league_id AND profile_id = p_receiver_id;
        SELECT COALESCE(SUM(bid_amount), 0) INTO v_committed FROM public.user_bids ub JOIN public.market_auctions ma ON ub.auction_id = ma.id WHERE ub.profile_id = p_receiver_id AND ma.status = 'active';
        
        IF (v_budget - v_committed) < ABS(p_cash_offer) THEN
            RETURN json_build_object('success', false, 'message', 'El destinatario no tiene fondos suficientes.');
        END IF;
    END IF;

    -- 3. Insert Offer
    INSERT INTO public.trade_offers (
        league_id, sender_id, receiver_id, sender_player_id, receiver_player_id, cash_offer, status, expires_at
    ) VALUES (
        p_league_id, p_sender_id, p_receiver_id, p_sender_player_id, p_receiver_player_id, p_cash_offer, 'pending', NOW() + INTERVAL '48 hours'
    );

    RETURN json_build_object('success', true);
END;
$$;
