export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string
          plan_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message: string
          plan_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string
          plan_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposals: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          error: string | null
          house_id: string
          id: string
          input_text: string
          proposal: Json | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          error?: string | null
          house_id: string
          id?: string
          input_text: string
          proposal?: Json | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          error?: string | null
          house_id?: string
          id?: string
          input_text?: string
          proposal?: Json | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposals_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      care_cards: {
        Row: {
          archived: boolean
          category: string
          created_at: string
          house_id: string
          id: string
          important_note: string | null
          instructions: string
          name: string
          photo_path: string | null
          room: string | null
        }
        Insert: {
          archived?: boolean
          category: string
          created_at?: string
          house_id: string
          id?: string
          important_note?: string | null
          instructions?: string
          name: string
          photo_path?: string | null
          room?: string | null
        }
        Update: {
          archived?: boolean
          category?: string
          created_at?: string
          house_id?: string
          id?: string
          important_note?: string | null
          instructions?: string
          name?: string
          photo_path?: string | null
          room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_cards_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          body: string
          created_at: string
          id: string
          last_error: string | null
          notification_id: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_states: {
        Row: {
          role: string
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          role: string
          status?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          city: string | null
          city_lat: number | null
          city_lon: number | null
          created_at: string
          id: string
          name: string
          owner_id: string
          rooms: string[]
          timezone: string
        }
        Insert: {
          city?: string | null
          city_lat?: number | null
          city_lon?: number | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          rooms?: string[]
          timezone?: string
        }
        Update: {
          city?: string | null
          city_lat?: number | null
          city_lon?: number | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          rooms?: string[]
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "houses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          author_id: string
          care_card_id: string | null
          created_at: string
          description: string
          id: string
          photo_path: string | null
          plan_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          visit_id: string | null
        }
        Insert: {
          author_id: string
          care_card_id?: string | null
          created_at?: string
          description?: string
          id?: string
          photo_path?: string | null
          plan_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          visit_id?: string | null
        }
        Update: {
          author_id?: string
          care_card_id?: string | null
          created_at?: string
          description?: string
          id?: string
          photo_path?: string | null
          plan_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_care_card_id_fkey"
            columns: ["care_card_id"]
            isOneToOne: false
            referencedRelation: "care_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          plan_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          plan_id: string | null
          read_at: string | null
          type: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          plan_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          plan_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          caregiver_id: string | null
          created_at: string
          end_date: string
          general_note: string | null
          house_id: string
          id: string
          start_date: string
          status: string
          timezone: string
          title: string
        }
        Insert: {
          caregiver_id?: string | null
          created_at?: string
          end_date: string
          general_note?: string | null
          house_id: string
          id?: string
          start_date: string
          status?: string
          timezone?: string
          title: string
        }
        Update: {
          caregiver_id?: string | null
          created_at?: string
          end_date?: string
          general_note?: string | null
          house_id?: string
          id?: string
          start_date?: string
          status?: string
          timezone?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email_completion_notifications: boolean
          email_delay_notifications: boolean
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email_completion_notifications?: boolean
          email_delay_notifications?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email_completion_notifications?: boolean
          email_delay_notifications?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string | null
          photo_path: string | null
          task_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note?: string | null
          photo_path?: string | null
          task_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string | null
          photo_path?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          care_card_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          instructions: string
          skip_reason: string | null
          sort_order: number
          source: string
          status: string
          title: string
          visit_id: string
        }
        Insert: {
          care_card_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instructions?: string
          skip_reason?: string | null
          sort_order?: number
          source?: string
          status?: string
          title: string
          visit_id: string
        }
        Update: {
          care_card_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instructions?: string
          skip_reason?: string | null
          sort_order?: number
          source?: string
          status?: string
          title?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_care_card_id_fkey"
            columns: ["care_card_id"]
            isOneToOne: false
            referencedRelation: "care_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          caregiver_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          delay_notified_at: string | null
          id: string
          plan_id: string
          scheduled_at: string
          status: string
        }
        Insert: {
          caregiver_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          delay_notified_at?: string | null
          id?: string
          plan_id: string
          scheduled_at: string
          status?: string
        }
        Update: {
          caregiver_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          delay_notified_at?: string | null
          id?: string
          plan_id?: string
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_rules: {
        Row: {
          active: boolean
          care_card_id: string | null
          created_at: string
          house_id: string
          id: string
          instruction: string
          threshold: number
          variable: string
        }
        Insert: {
          active?: boolean
          care_card_id?: string | null
          created_at?: string
          house_id: string
          id?: string
          instruction: string
          threshold: number
          variable: string
        }
        Update: {
          active?: boolean
          care_card_id?: string | null
          created_at?: string
          house_id?: string
          id?: string
          instruction?: string
          threshold?: number
          variable?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_rules_care_card_id_fkey"
            columns: ["care_card_id"]
            isOneToOne: false
            referencedRelation: "care_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_rules_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_suggestions: {
        Row: {
          condition_text: string
          created_at: string
          fetched_at: string
          forecast_date: string
          forecast_value: number
          id: string
          source: string
          status: string
          visit_id: string
          weather_rule_id: string
        }
        Insert: {
          condition_text: string
          created_at?: string
          fetched_at?: string
          forecast_date: string
          forecast_value: number
          id?: string
          source?: string
          status?: string
          visit_id: string
          weather_rule_id: string
        }
        Update: {
          condition_text?: string
          created_at?: string
          fetched_at?: string
          forecast_date?: string
          forecast_value?: number
          id?: string
          source?: string
          status?: string
          visit_id?: string
          weather_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_suggestions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_suggestions_weather_rule_id_fkey"
            columns: ["weather_rule_id"]
            isOneToOne: false
            referencedRelation: "weather_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string }
      invitation_info: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          house_name: string
          owner_name: string
          plan_id: string
          plan_title: string
          status: string
        }[]
      }
      is_house_caregiver: { Args: { _house_id: string }; Returns: boolean }
      is_house_owner: { Args: { _house_id: string }; Returns: boolean }
      is_plan_caregiver: { Args: { _plan_id: string }; Returns: boolean }
      is_plan_owner: { Args: { _plan_id: string }; Returns: boolean }
      is_plan_participant: { Args: { _plan_id: string }; Returns: boolean }
      is_task_participant: { Args: { _task_id: string }; Returns: boolean }
      is_visit_participant: { Args: { _visit_id: string }; Returns: boolean }
      shares_plan_with: { Args: { _profile_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
