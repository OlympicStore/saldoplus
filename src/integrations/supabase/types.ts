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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          sort_order: number
          sub_account_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_records: {
        Row: {
          bill: string
          created_at: string
          id: string
          month: number
          status: string
          sub_account_id: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          bill: string
          created_at?: string
          id?: string
          month: number
          status?: string
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          bill?: string
          created_at?: string
          id?: string
          month?: number
          status?: string
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_records_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sub_account_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sub_account_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sub_account_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      category_budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_value: number
          month: number
          sub_account_id: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          limit_value?: number
          month: number
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          limit_value?: number
          month?: number
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          account: string | null
          created_at: string
          current_value: number
          deadline_months: number
          id: string
          monthly_savings: number
          name: string
          sub_account_id: string | null
          term: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string | null
          created_at?: string
          current_value?: number
          deadline_months?: number
          id?: string
          monthly_savings?: number
          name: string
          sub_account_id?: string | null
          term?: string
          total_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string | null
          created_at?: string
          current_value?: number
          deadline_months?: number
          id?: string
          monthly_savings?: number
          name?: string
          sub_account_id?: string | null
          term?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          account: string
          created_at: string
          due_day: number
          id: string
          item: string
          monthly_paid: Json
          monthly_responsible: Json
          monthly_values: Json
          sub_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string
          created_at?: string
          due_day?: number
          id?: string
          item: string
          monthly_paid?: Json
          monthly_responsible?: Json
          monthly_values?: Json
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string
          created_at?: string
          due_day?: number
          id?: string
          item?: string
          monthly_paid?: Json
          monthly_responsible?: Json
          monthly_values?: Json
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      house_data: {
        Row: {
          created_at: string
          down_payment: number
          estimated_expenses: number
          extra_expenses: Json
          house_value: number
          id: string
          monthly_income: number
          monthly_payment: number
          monthly_payment_status: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          down_payment?: number
          estimated_expenses?: number
          extra_expenses?: Json
          house_value?: number
          id?: string
          monthly_income?: number
          monthly_payment?: number
          monthly_payment_status?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          down_payment?: number
          estimated_expenses?: number
          extra_expenses?: Json
          house_value?: number
          id?: string
          monthly_income?: number
          monthly_payment?: number
          monthly_payment_status?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          account: string
          created_at: string
          date: string
          description: string
          id: string
          person: string | null
          sub_account_id: string | null
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account?: string
          created_at?: string
          date: string
          description?: string
          id?: string
          person?: string | null
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          account?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          person?: string | null
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "incomes_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          account: string
          created_at: string
          date: string
          description: string
          id: string
          returns: number | null
          sub_account_id: string | null
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account?: string
          created_at?: string
          date: string
          description?: string
          id?: string
          returns?: number | null
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          account?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          returns?: number | null
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "investments_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_consultants: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          partner_id: string
          phone: string | null
          photo_position: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          partner_id: string
          phone?: string | null
          photo_position?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          partner_id?: string
          phone?: string | null
          photo_position?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_consultants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invites: {
        Row: {
          consultant_email: string | null
          consultant_id: string | null
          consultant_name: string | null
          consultant_phone: string | null
          consultant_photo_position: string | null
          consultant_photo_url: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          partner_id: string
          status: string
        }
        Insert: {
          consultant_email?: string | null
          consultant_id?: string | null
          consultant_name?: string | null
          consultant_phone?: string | null
          consultant_photo_position?: string | null
          consultant_photo_url?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          partner_id: string
          status?: string
        }
        Update: {
          consultant_email?: string | null
          consultant_id?: string | null
          consultant_name?: string | null
          consultant_phone?: string | null
          consultant_photo_position?: string | null
          consultant_photo_url?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          partner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invites_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "partner_consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invites_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          brand_color: string | null
          brand_logo_url: string | null
          consultant_email: string | null
          consultant_name: string | null
          consultant_phone: string | null
          consultant_photo_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          plan_limit: number
          plan_type: string
        }
        Insert: {
          active?: boolean
          brand_color?: string | null
          brand_logo_url?: string | null
          consultant_email?: string | null
          consultant_name?: string | null
          consultant_phone?: string | null
          consultant_photo_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          plan_limit?: number
          plan_type?: string
        }
        Update: {
          active?: boolean
          brand_color?: string | null
          brand_logo_url?: string | null
          consultant_email?: string | null
          consultant_name?: string | null
          consultant_phone?: string | null
          consultant_photo_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          plan_limit?: number
          plan_type?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          changed_at: string
          id: string
          new_value: number
          old_value: number
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_value?: number
          old_value?: number
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_value?: number
          old_value?: number
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          partner_id: string | null
          plan: string
          plan_expires_at: string | null
          plan_source: string
          plan_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          partner_id?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_source?: string
          plan_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          partner_id?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_source?: string
          plan_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_configs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          monthly_values: Json
          person: string
          sub_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          monthly_values?: Json
          person: string
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          monthly_values?: Json
          person?: string
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_configs_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      sub_accounts: {
        Row: {
          avatar_color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string
          date: string
          description: string
          from_account: string
          id: string
          sub_account_id: string | null
          to_account: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          description?: string
          from_account?: string
          id?: string
          sub_account_id?: string | null
          to_account?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          from_account?: string
          id?: string
          sub_account_id?: string | null
          to_account?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfers_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          people: string[]
          sub_account_id: string | null
          updated_at: string
          user_id: string
          variable_categories: string[]
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          people?: string[]
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
          variable_categories?: string[]
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          people?: string[]
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
          variable_categories?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_expenses: {
        Row: {
          account: string
          category: string
          created_at: string
          date: string
          description: string
          id: string
          recurring: boolean
          responsible: string | null
          sub_account_id: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account?: string
          category?: string
          created_at?: string
          date: string
          description?: string
          id?: string
          recurring?: boolean
          responsible?: string | null
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          account?: string
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          recurring?: boolean
          responsible?: string | null
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "variable_expenses_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_stats: { Args: never; Returns: Json }
      get_consultant_partner_id: { Args: never; Returns: string }
      get_my_partner_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_group_with_invite: {
        Args: { _group_id: string; _invite_code: string }
        Returns: boolean
      }
      verify_invite_code: {
        Args: { _group_id: string; _invite_code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "partner" | "consultant"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "partner", "consultant"],
    },
  },
} as const
