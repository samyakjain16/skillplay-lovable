export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contest_games: {
        Row: {
          contest_id: string
          created_at: string | null
          game_content_id: string
          id: string
          sequence_number: number
        }
        Insert: {
          contest_id: string
          created_at?: string | null
          game_content_id: string
          id?: string
          sequence_number: number
        }
        Update: {
          contest_id?: string
          created_at?: string | null
          game_content_id?: string
          id?: string
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_games_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_games_game_content_id_fkey"
            columns: ["game_content_id"]
            isOneToOne: false
            referencedRelation: "game_content"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string | null
          current_participants: number | null
          description: string | null
          end_time: string
          entry_fee: number
          id: string
          max_participants: number | null
          prize_distribution_type: string
          prize_pool: number
          series_count: number
          start_time: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          end_time: string
          entry_fee?: number
          id?: string
          max_participants?: number | null
          prize_distribution_type?: string
          prize_pool?: number
          series_count?: number
          start_time: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          current_participants?: number | null
          description?: string | null
          end_time?: string
          entry_fee?: number
          id?: string
          max_participants?: number | null
          prize_distribution_type?: string
          prize_pool?: number
          series_count?: number
          start_time?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      game_content: {
        Row: {
          category: Database["public"]["Enums"]["game_category"]
          content: Json
          created_at: string | null
          created_by: string | null
          difficulty_level: number | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["game_category"]
          content: Json
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["game_category"]
          content?: Json
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_progress: {
        Row: {
          completed_at: string | null
          contest_id: string
          created_at: string | null
          game_content_id: string
          id: string
          is_correct: boolean | null
          player_answer: Json | null
          score: number | null
          started_at: string | null
          time_taken: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contest_id: string
          created_at?: string | null
          game_content_id: string
          id?: string
          is_correct?: boolean | null
          player_answer?: Json | null
          score?: number | null
          started_at?: string | null
          time_taken?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contest_id?: string
          created_at?: string | null
          game_content_id?: string
          id?: string
          is_correct?: boolean | null
          player_answer?: Json | null
          score?: number | null
          started_at?: string | null
          time_taken?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_game_progress_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_progress_game_content_id_fkey"
            columns: ["game_content_id"]
            isOneToOne: false
            referencedRelation: "game_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          is_admin: boolean | null
          updated_at: string
          username: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          is_admin?: boolean | null
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean | null
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      user_contests: {
        Row: {
          contest_id: string
          id: string
          joined_at: string | null
          score: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          contest_id: string
          id?: string
          joined_at?: string | null
          score?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          contest_id?: string
          id?: string
          joined_at?: string | null
          score?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_contests_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reference_id: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_contest: {
        Args: {
          p_user_id: string
          p_contest_id: string
        }
        Returns: Json
      }
      update_completed_contests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      game_category: "arrange_sort" | "trivia" | "spot_difference"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
