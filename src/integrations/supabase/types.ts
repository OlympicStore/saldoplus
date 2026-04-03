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
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bill_records: {
        Row: {
          bill: string
          created_at: string
          id: string
          month: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bill: string
          created_at?: string
          id?: string
          month: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bill?: string
          created_at?: string
          id?: string
          month?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_value: number
          month: number
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
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
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
          term?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups_safe"
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
      incomes: {
        Row: {
          account: string
          created_at: string
          date: string
          description: string
          id: string
          person: string | null
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
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      investments: {
        Row: {
          account: string
          created_at: string
          date: string
          description: string
          id: string
          returns: number | null
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
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          plan: Database["public"]["Enums"]["app_plan"]
          plan_expires_at: string | null
          plan_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          plan?: Database["public"]["Enums"]["app_plan"]
          plan_expires_at?: string | null
          plan_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          plan_expires_at?: string | null
          plan_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salary_configs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          monthly_values: Json
          person: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          monthly_values?: Json
          person: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          monthly_values?: Json
          person?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
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
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
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
          to_account?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
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
          updated_at: string
          user_id: string
          variable_categories: string[]
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          people?: string[]
          updated_at?: string
          user_id: string
          variable_categories?: string[]
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          people?: string[]
          updated_at?: string
          user_id?: string
          variable_categories?: string[]
        }
        Relationships: []
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
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      groups_safe: {
        Row: {
          created_at: string | null
          id: string | null
          invite_code: string | null
          name: string | null
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          invite_code?: never
          name?: string | null
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          invite_code?: never
          name?: string | null
          owner_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_plan: "essencial" | "casa" | "pro"
      app_role: "admin" | "moderator" | "user"
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
      app_plan: ["essencial", "casa", "pro"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
