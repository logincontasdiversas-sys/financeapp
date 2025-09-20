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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      banks: {
        Row: {
          account_type: string | null
          balance: number | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          balance?: number | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          balance?: number | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount_limit: number
          category_id: string
          id: string
          period_month: number
          period_year: number
          tenant_id: string
        }
        Insert: {
          amount_limit: number
          category_id: string
          id?: string
          period_month: number
          period_year: number
          tenant_id: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          id?: string
          period_month?: number
          period_year?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived: boolean
          emoji: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          archived?: boolean
          emoji?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          archived?: boolean
          emoji?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          available_limit: number | null
          brand: string | null
          closing_day: number | null
          created_at: string
          current_balance: number | null
          due_day: number | null
          id: string
          limit_amount: number
          name: string
          tenant_id: string
        }
        Insert: {
          available_limit?: number | null
          brand?: string | null
          closing_day?: number | null
          created_at?: string
          current_balance?: number | null
          due_day?: number | null
          id?: string
          limit_amount?: number
          name: string
          tenant_id: string
        }
        Update: {
          available_limit?: number | null
          brand?: string | null
          closing_day?: number | null
          created_at?: string
          current_balance?: number | null
          due_day?: number | null
          id?: string
          limit_amount?: number
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          category_id: string | null
          created_at: string
          due_date: string | null
          id: string
          image_url: string | null
          monthly_interest: number | null
          paid_amount: number
          settled: boolean
          tenant_id: string
          title: string
          total_amount: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          monthly_interest?: number | null
          paid_amount?: number
          settled?: boolean
          tenant_id: string
          title: string
          total_amount: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          image_url?: string | null
          monthly_interest?: number | null
          paid_amount?: number
          settled?: boolean
          tenant_id?: string
          title?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          id: string
          note: string | null
          occurred_on: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          occurred_on: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          occurred_on?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          completed: boolean
          created_at: string
          current_amount: number
          id: string
          image_url: string | null
          target_amount: number
          target_date: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed?: boolean
          created_at?: string
          current_amount?: number
          id?: string
          image_url?: string | null
          target_amount: number
          target_date?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed?: boolean
          created_at?: string
          current_amount?: number
          id?: string
          image_url?: string | null
          target_amount?: number
          target_date?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_tenant_id: string | null
          display_name: string | null
          onboarding_done: boolean
          user_id: string
        }
        Insert: {
          active_tenant_id?: string | null
          display_name?: string | null
          onboarding_done?: boolean
          user_id: string
        }
        Update: {
          active_tenant_id?: string | null
          display_name?: string | null
          onboarding_done?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          joined_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_id: string | null
          card_id: string | null
          category_id: string | null
          created_at: string
          date: string
          id: string
          kind: string
          note: string | null
          payment_method: string | null
          status: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          id?: string
          kind: string
          note?: string | null
          payment_method?: string | null
          status: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          kind?: string
          note?: string | null
          payment_method?: string | null
          status?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_card_id"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_card_id"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "v_card_spent_month"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "v_bank_balances"
            referencedColumns: ["bank_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_bank_balances: {
        Row: {
          balance: number | null
          bank_id: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_card_spent_month: {
        Row: {
          card_id: string | null
          month: string | null
          spent: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_totals_month_year: {
        Row: {
          expense_month: number | null
          income_month: number | null
          month: number | null
          tenant_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      __ensure_policy: {
        Args: {
          p_cmd: string
          p_policy: string
          p_qual: string
          p_schema: string
          p_table: string
          p_with_check?: string
        }
        Returns: undefined
      }
      active_tenant: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      category_totals: {
        Args: { p_end: string; p_start: string; p_tenant: string }
        Returns: {
          category: string
          total: number
        }[]
      }
      create_tenant_and_join: {
        Args: { p_name: string }
        Returns: string
      }
      is_member: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      migrate_local_data: {
        Args: {
          p_banks?: Json
          p_cards?: Json
          p_categories?: Json
          p_debts?: Json
          p_goals?: Json
          p_transactions?: Json
        }
        Returns: Json
      }
      switch_active_tenant: {
        Args: { p_tenant: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
