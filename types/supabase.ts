export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      gameweeks: {
        Row: {
          id: number
          name: string
          start_date: string
          end_date: string
          is_active: boolean | null
          is_locked: boolean | null
        }
        Insert: {
          id?: number
          name: string
          start_date: string
          end_date: string
          is_active?: boolean | null
          is_locked?: boolean | null
        }
        Update: {
          id?: number
          name?: string
          start_date?: string
          end_date?: string
          is_active?: boolean | null
          is_locked?: boolean | null
        }
      }
      league_participants: {
        Row: {
          league_id: string
          profile_id: string
          current_budget: number | null
          total_points: number | null
        }
        Insert: {
          league_id: string
          profile_id: string
          current_budget?: number | null
          total_points?: number | null
        }
        Update: {
          league_id?: string
          profile_id?: string
          current_budget?: number | null
          total_points?: number | null
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          invite_code: string | null
          creator_id: string | null
          is_public: boolean | null
          max_participants: number | null
          budget_limit: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string | null
          creator_id?: string | null
          is_public?: boolean | null
          max_participants?: number | null
          budget_limit?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string | null
          creator_id?: string | null
          is_public?: boolean | null
          max_participants?: number | null
          budget_limit?: number | null
          created_at?: string | null
        }
      }
      market_transactions: {
        Row: {
          id: string
          league_id: string | null
          profile_id: string | null
          player_id: string | null
          type: string | null
          price: number
          created_at: string | null
        }
        Insert: {
          id?: string
          league_id?: string | null
          profile_id?: string | null
          player_id?: string | null
          type?: string | null
          price: number
          created_at?: string | null
        }
        Update: {
          id?: string
          league_id?: string | null
          profile_id?: string | null
          player_id?: string | null
          type?: string | null
          price?: number
          created_at?: string | null
        }
      }
      matches: {
        Row: {
          id: string
          vlr_id: string | null
          team_a: string | null
          team_b: string | null
          match_date: string | null
          status: string | null
          gameweek_id: number | null
        }
        Insert: {
          id?: string
          vlr_id?: string | null
          team_a?: string | null
          team_b?: string | null
          match_date?: string | null
          status?: string | null
          gameweek_id?: number | null
        }
        Update: {
          id?: string
          vlr_id?: string | null
          team_a?: string | null
          team_b?: string | null
          match_date?: string | null
          status?: string | null
          gameweek_id?: number | null
        }
      }
      participant_scores_history: {
        Row: {
          league_id: string
          profile_id: string
          gameweek_id: number
          points_earned: number | null
          rank_in_league: number | null
        }
        Insert: {
          league_id: string
          profile_id: string
          gameweek_id: number
          points_earned?: number | null
          rank_in_league?: number | null
        }
        Update: {
          league_id?: string
          profile_id?: string
          gameweek_id?: number
          points_earned?: number | null
          rank_in_league?: number | null
        }
      }
      player_performances: {
        Row: {
          id: string
          match_id: string | null
          player_id: string | null
          kills: number | null
          deaths: number | null
          assists: number | null
          clutches: number | null
          fb: number | null
          fantasy_points: number | null
        }
        Insert: {
          id?: string
          match_id?: string | null
          player_id?: string | null
          kills?: number | null
          deaths?: number | null
          assists?: number | null
          clutches?: number | null
          fb?: number | null
          fantasy_points?: number | null
        }
        Update: {
          id?: string
          match_id?: string | null
          player_id?: string | null
          kills?: number | null
          deaths?: number | null
          assists?: number | null
          clutches?: number | null
          fb?: number | null
          fantasy_points?: number | null
        }
      }
      pro_players: {
        Row: {
          id: string
          nickname: string
          full_name: string | null
          team_id: string | null
          role: string | null
          market_value: number | null
          photo_url: string | null
        }
        Insert: {
          id?: string
          nickname: string
          full_name?: string | null
          team_id?: string | null
          role?: string | null
          market_value?: number | null
          photo_url?: string | null
        }
        Update: {
          id?: string
          nickname?: string
          full_name?: string | null
          team_id?: string | null
          role?: string | null
          market_value?: number | null
          photo_url?: string | null
        }
      }
      pro_teams: {
        Row: {
          id: string
          name: string
          tag: string
          logo_url: string | null
          region: string | null
        }
        Insert: {
          id?: string
          name: string
          tag: string
          logo_url?: string | null
          region?: string | null
        }
        Update: {
          id?: string
          name?: string
          tag?: string
          logo_url?: string | null
          region?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          global_points: number | null
          created_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          global_points?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          global_points?: number | null
          created_at?: string | null
        }
      }
      user_rosters: {
        Row: {
          id: string
          league_id: string | null
          profile_id: string | null
          player_id: string | null
          acquisition_price: number
          is_active: boolean | null
        }
        Insert: {
          id?: string
          league_id?: string | null
          profile_id?: string | null
          player_id?: string | null
          acquisition_price: number
          is_active?: boolean | null
        }
        Update: {
          id?: string
          league_id?: string | null
          profile_id?: string | null
          player_id?: string | null
          acquisition_price?: number
          is_active?: boolean | null
        }
      }
    }
  }
}
