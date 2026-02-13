-- =====================================================
-- TRANSACCIONES ATÓMICAS PARA FANTASY VCT
-- Bug #8: Implementación de operaciones atómicas
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN: accept_trade_offer_atomic
-- Acepta una oferta de trade de forma atómica
-- =====================================================
CREATE OR REPLACE FUNCTION accept_trade_offer_atomic(
    p_offer_id UUID,
    p_receiver_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_offer RECORD;
    v_sender_budget NUMERIC;
    v_receiver_budget NUMERIC;
    v_result JSON;
BEGIN
    -- 1. Lock and get offer details
    SELECT * INTO v_offer
    FROM trade_offers
    WHERE id = p_offer_id
    FOR UPDATE;

    -- Validate offer exists and is pending
    IF v_offer IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Oferta no encontrada');
    END IF;

    IF v_offer.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Esta oferta ya no está disponible');
    END IF;

    IF v_offer.receiver_id != p_receiver_id THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para aceptar esta oferta');
    END IF;

    -- 2. Get and lock participant budgets
    SELECT current_budget INTO v_sender_budget
    FROM league_participants
    WHERE league_id = v_offer.league_id AND profile_id = v_offer.sender_id
    FOR UPDATE;

    SELECT current_budget INTO v_receiver_budget
    FROM league_participants
    WHERE league_id = v_offer.league_id AND profile_id = v_offer.receiver_id
    FOR UPDATE;

    -- 3. Validate budgets
    IF v_offer.cash_offer > 0 AND v_sender_budget < v_offer.cash_offer THEN
        RETURN json_build_object('success', false, 'error', 'El remitente no tiene fondos suficientes');
    END IF;

    IF v_offer.cash_offer < 0 AND v_receiver_budget < ABS(v_offer.cash_offer) THEN
        RETURN json_build_object('success', false, 'error', 'No tienes fondos suficientes');
    END IF;

    -- 4. Transfer players (if applicable)
    IF v_offer.sender_player_id IS NOT NULL THEN
        UPDATE user_rosters
        SET profile_id = v_offer.receiver_id
        WHERE league_id = v_offer.league_id
          AND profile_id = v_offer.sender_id
          AND player_id = v_offer.sender_player_id;
    END IF;

    IF v_offer.receiver_player_id IS NOT NULL THEN
        UPDATE user_rosters
        SET profile_id = v_offer.sender_id
        WHERE league_id = v_offer.league_id
          AND profile_id = v_offer.receiver_id
          AND player_id = v_offer.receiver_player_id;
    END IF;

    -- 5. Transfer cash
    IF v_offer.cash_offer != 0 THEN
        UPDATE league_participants
        SET current_budget = current_budget - v_offer.cash_offer
        WHERE league_id = v_offer.league_id AND profile_id = v_offer.sender_id;

        UPDATE league_participants
        SET current_budget = current_budget + v_offer.cash_offer
        WHERE league_id = v_offer.league_id AND profile_id = v_offer.receiver_id;
    END IF;

    -- 6. Update offer status
    UPDATE trade_offers
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_offer_id;

    -- 7. Log transaction
    INSERT INTO transaction_logs (league_id, profile_id, transaction_type, amount, description)
    VALUES (
        v_offer.league_id,
        v_offer.receiver_id,
        'trade_accepted',
        v_offer.cash_offer,
        'Trade aceptado: Oferta #' || p_offer_id
    );

    RETURN json_build_object('success', true, 'message', 'Trade aceptado exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- 2. FUNCIÓN: pay_release_clause_atomic
-- Paga la cláusula de rescisión de forma atómica
-- =====================================================
CREATE OR REPLACE FUNCTION pay_release_clause_atomic(
    p_league_id UUID,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_player_id UUID,
    p_clause_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_buyer_budget NUMERIC;
    v_seller_budget NUMERIC;
    v_roster_entry RECORD;
    v_buyer_roster_count INT;
BEGIN
    -- 1. Lock and get buyer budget
    SELECT current_budget INTO v_buyer_budget
    FROM league_participants
    WHERE league_id = p_league_id AND profile_id = p_buyer_id
    FOR UPDATE;

    IF v_buyer_budget IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Comprador no encontrado');
    END IF;

    -- 2. Check buyer has enough funds
    IF v_buyer_budget < p_clause_amount THEN
        RETURN json_build_object('success', false, 'error', 'Fondos insuficientes');
    END IF;

    -- 3. Check buyer roster capacity
    SELECT COUNT(*) INTO v_buyer_roster_count
    FROM user_rosters
    WHERE league_id = p_league_id AND profile_id = p_buyer_id;

    IF v_buyer_roster_count >= 10 THEN
        RETURN json_build_object('success', false, 'error', 'Roster lleno (máximo 10 jugadores)');
    END IF;

    -- 4. Lock and get seller budget
    SELECT current_budget INTO v_seller_budget
    FROM league_participants
    WHERE league_id = p_league_id AND profile_id = p_seller_id
    FOR UPDATE;

    -- 5. Lock and get roster entry
    SELECT * INTO v_roster_entry
    FROM user_rosters
    WHERE league_id = p_league_id
      AND profile_id = p_seller_id
      AND player_id = p_player_id
    FOR UPDATE;

    IF v_roster_entry IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Jugador no encontrado en el roster del vendedor');
    END IF;

    -- 6. Cancel any active auctions for this player
    UPDATE market_auctions
    SET status = 'canceled', updated_at = NOW()
    WHERE league_id = p_league_id
      AND player_id = p_player_id
      AND seller_id = p_seller_id
      AND status = 'active';

    -- 7. Delete all bids for canceled auctions
    DELETE FROM user_bids
    WHERE auction_id IN (
        SELECT id FROM market_auctions
        WHERE league_id = p_league_id
          AND player_id = p_player_id
          AND seller_id = p_seller_id
          AND status = 'canceled'
    );

    -- 8. Transfer player ownership
    UPDATE user_rosters
    SET profile_id = p_buyer_id,
        acquisition_price = p_clause_amount,
        slot_type = 'substitute',
        is_starter = false
    WHERE league_id = p_league_id
      AND profile_id = p_seller_id
      AND player_id = p_player_id;

    -- 9. Transfer funds
    UPDATE league_participants
    SET current_budget = current_budget - p_clause_amount
    WHERE league_id = p_league_id AND profile_id = p_buyer_id;

    UPDATE league_participants
    SET current_budget = current_budget + p_clause_amount
    WHERE league_id = p_league_id AND profile_id = p_seller_id;

    -- 10. Log transaction
    INSERT INTO transaction_logs (league_id, profile_id, transaction_type, amount, description)
    VALUES (
        p_league_id,
        p_buyer_id,
        'clause_paid',
        -p_clause_amount,
        'Cláusula pagada por jugador #' || p_player_id
    );

    INSERT INTO transaction_logs (league_id, profile_id, transaction_type, amount, description)
    VALUES (
        p_league_id,
        p_seller_id,
        'clause_received',
        p_clause_amount,
        'Cláusula recibida por jugador #' || p_player_id
    );

    RETURN json_build_object('success', true, 'message', 'Cláusula pagada exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- 3. FUNCIÓN: resolve_auction_atomic
-- Resuelve una subasta expirada de forma atómica
-- =====================================================
CREATE OR REPLACE FUNCTION resolve_auction_atomic(
    p_auction_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_auction RECORD;
    v_winner_id UUID;
    v_winning_bid NUMERIC;
    v_winner_budget NUMERIC;
    v_winner_roster_count INT;
    v_seller_budget NUMERIC;
BEGIN
    -- 1. Lock and get auction details
    SELECT * INTO v_auction
    FROM market_auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    IF v_auction IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Subasta no encontrada');
    END IF;

    IF v_auction.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Subasta no activa');
    END IF;

    IF v_auction.expires_at > NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Subasta aún no ha expirado');
    END IF;

    -- 2. Get highest bidder
    v_winner_id := v_auction.highest_bidder_id;
    v_winning_bid := v_auction.current_bid;

    -- 3. If no bids, return to seller
    IF v_winner_id IS NULL THEN
        UPDATE market_auctions
        SET status = 'expired', updated_at = NOW()
        WHERE id = p_auction_id;

        RETURN json_build_object('success', true, 'message', 'Subasta expirada sin postores');
    END IF;

    -- 4. Lock winner budget and check capacity
    SELECT current_budget INTO v_winner_budget
    FROM league_participants
    WHERE league_id = v_auction.league_id AND profile_id = v_winner_id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_winner_roster_count
    FROM user_rosters
    WHERE league_id = v_auction.league_id AND profile_id = v_winner_id;

    IF v_winner_roster_count >= 10 THEN
        -- Winner roster is full, auction fails
        UPDATE market_auctions
        SET status = 'failed', updated_at = NOW()
        WHERE id = p_auction_id;

        RETURN json_build_object('success', false, 'error', 'Ganador tiene roster lleno');
    END IF;

    -- 5. Lock seller budget
    SELECT current_budget INTO v_seller_budget
    FROM league_participants
    WHERE league_id = v_auction.league_id AND profile_id = v_auction.seller_id
    FOR UPDATE;

    -- 6. Transfer player
    UPDATE user_rosters
    SET profile_id = v_winner_id,
        acquisition_price = v_winning_bid,
        slot_type = 'substitute',
        is_starter = false
    WHERE league_id = v_auction.league_id
      AND profile_id = v_auction.seller_id
      AND player_id = v_auction.player_id;

    -- 7. Transfer funds
    UPDATE league_participants
    SET current_budget = current_budget - v_winning_bid
    WHERE league_id = v_auction.league_id AND profile_id = v_winner_id;

    UPDATE league_participants
    SET current_budget = current_budget + v_winning_bid
    WHERE league_id = v_auction.league_id AND profile_id = v_auction.seller_id;

    -- 8. Update auction status
    UPDATE market_auctions
    SET status = 'sold', updated_at = NOW()
    WHERE id = p_auction_id;

    -- 9. Delete all bids
    DELETE FROM user_bids WHERE auction_id = p_auction_id;

    -- 10. Log transaction
    INSERT INTO transaction_logs (league_id, profile_id, transaction_type, amount, description)
    VALUES (
        v_auction.league_id,
        v_winner_id,
        'auction_won',
        -v_winning_bid,
        'Subasta ganada: Jugador #' || v_auction.player_id
    );

    INSERT INTO transaction_logs (league_id, profile_id, transaction_type, amount, description)
    VALUES (
        v_auction.league_id,
        v_auction.seller_id,
        'auction_sold',
        v_winning_bid,
        'Jugador vendido en subasta #' || p_auction_id
    );

    RETURN json_build_object('success', true, 'message', 'Subasta resuelta exitosamente', 'winner_id', v_winner_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- COMENTARIOS Y NOTAS
-- =====================================================
-- Estas funciones garantizan atomicidad mediante:
-- 1. FOR UPDATE locks para prevenir condiciones de carrera
-- 2. Bloques EXCEPTION para rollback automático en caso de error
-- 3. Todas las operaciones en una sola transacción
-- 4. Validaciones exhaustivas antes de modificar datos
--
-- Para usar estas funciones desde el código TypeScript:
-- await supabase.rpc('accept_trade_offer_atomic', { p_offer_id: '...', p_receiver_id: '...' })
