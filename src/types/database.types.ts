export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string; // timestamptz
          email: string;
          full_name: string | null;
          id: string;
          is_active: boolean | null;
          phone: string | null;
          role: Database["public"]["Enums"]["role_enum"];
          team_id: string | null;
          updated_at: string; // timestamptz
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string; // timestamptz
          email: string;
          full_name?: string | null;
          id: string;
          is_active?: boolean | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["role_enum"];
          team_id?: string | null;
          updated_at?: string; // timestamptz
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string; // timestamptz
          email?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["role_enum"];
          team_id?: string | null;
          updated_at?: string; // timestamptz
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      settings: {
        Row: {
          id: number;
          global_calendars_target: number;
          default_team_target: number;
          max_calendars_per_transaction: number;
          sync_frequency_minutes: number;
          notification_emails: string[] | null;
          primary_color: string | null;
        };
        Insert: {
          id?: number;
          global_calendars_target?: number;
          default_team_target?: number;
          max_calendars_per_transaction?: number;
          sync_frequency_minutes?: number;
          notification_emails?: string[] | null;
          primary_color?: string | null;
        };
        Update: {
          id?: number;
          global_calendars_target?: number;
          default_team_target?: number;
          max_calendars_per_transaction?: number;
          sync_frequency_minutes?: number;
          notification_emails?: string[] | null;
          primary_color?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          calendars_target: number | null;
          chef_id: string | null;
          color: string | null;
          created_at: string; // timestamptz
          id: string;
          name: string;
          updated_at: string; // timestamptz
        };
        Insert: {
          calendars_target?: number | null;
          chef_id?: string | null;
          color?: string | null;
          created_at?: string; // timestamptz
          id?: string;
          name: string;
          updated_at?: string; // timestamptz
        };
        Update: {
          calendars_target?: number | null;
          chef_id?: string | null;
          color?: string | null;
          created_at?: string; // timestamptz
          id?: string;
          name?: string;
          updated_at?: string; // timestamptz
        };
        Relationships: [
          {
            foreignKeyName: "teams_chef_id_fkey";
            columns: ["chef_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tournees: {
        Row: {
          calendars_distributed: number | null;
          calendars_initial: number;
          calendars_remaining: number | null;
          created_at: string; // timestamptz
          ended_at: string | null; // timestamptz
          id: string;
          notes: string | null;
          started_at: string; // timestamptz
          status: Database["public"]["Enums"]["tournee_status_enum"] | null;
          team_id: string | null;
          total_amount: number | null;
          total_transactions: number | null;
          user_id: string;
          validated_at: string | null; // timestamptz
          validated_by: string | null;
        };
        Insert: {
          calendars_distributed?: number | null;
          calendars_initial: number;
          calendars_remaining?: number | null;
          created_at?: string; // timestamptz
          ended_at?: string | null; // timestamptz
          id?: string;
          notes?: string | null;
          started_at?: string; // timestamptz
          status?: Database["public"]["Enums"]["tournee_status_enum"] | null;
          team_id?: string | null;
          total_amount?: number | null;
          total_transactions?: number | null;
          user_id: string;
          validated_at?: string | null; // timestamptz
          validated_by?: string | null;
        };
        Update: {
          calendars_distributed?: number | null;
          calendars_initial?: number;
          calendars_remaining?: number | null;
          created_at?: string; // timestamptz
          ended_at?: string | null; // timestamptz
          id?: string;
          notes?: string | null;
          started_at?: string; // timestamptz
          status?: Database["public"]["Enums"]["tournee_status_enum"] | null;
          team_id?: string | null;
          total_amount?: number | null;
          total_transactions?: number | null;
          user_id?: string;
          validated_at?: string | null; // timestamptz
          validated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tournees_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournees_validated_by_fkey";
            columns: ["validated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          amount: number;
          calendars_given: number | null;
          cheque_banque: string | null;
          cheque_date_emission: string | null; // timestamptz
          cheque_deposited_at: string | null; // timestamptz
          cheque_numero: string | null;
          cheque_tireur: string | null;
          created_at: string; // timestamptz
          donator_address: string | null;
          donator_email: string | null;
          donator_name: string | null;
          id: string;
          idempotency_key: string | null;
          notes: string | null;
          payment_method: Database["public"]["Enums"]["payment_method_enum"];
          processed_at: string | null; // timestamptz
          qr_verification_code: string | null;
          receipt_number: string | null;
          receipt_url: string | null;
          status: Database["public"]["Enums"]["transaction_status_enum"] | null;
          stripe_session_id: string | null;
          team_id: string | null;
          tournee_id: string | null;
          user_id: string;
          validated_team_at: string | null; // timestamptz
          validated_tresorier_at: string | null; // timestamptz
        };
        Insert: {
          amount: number;
          calendars_given?: number | null;
          cheque_banque?: string | null;
          cheque_date_emission?: string | null; // timestamptz
          cheque_deposited_at?: string | null; // timestamptz
          cheque_numero?: string | null;
          cheque_tireur?: string | null;
          created_at?: string; // timestamptz
          donator_address?: string | null;
          donator_email?: string | null;
          donator_name?: string | null;
          id?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          payment_method: Database["public"]["Enums"]["payment_method_enum"];
          processed_at?: string | null; // timestamptz
          qr_verification_code?: string | null;
          receipt_number?: string | null;
          receipt_url?: string | null;
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null;
          stripe_session_id?: string | null;
          team_id?: string | null;
          tournee_id?: string | null;
          user_id: string;
          validated_team_at?: string | null; // timestamptz
          validated_tresorier_at?: string | null; // timestamptz
        };
        Update: {
          amount?: number;
          calendars_given?: number | null;
          cheque_banque?: string | null;
          cheque_date_emission?: string | null; // timestamptz
          cheque_deposited_at?: string | null; // timestamptz
          cheque_numero?: string | null;
          cheque_tireur?: string | null;
          created_at?: string; // timestamptz
          donator_address?: string | null;
          donator_email?: string | null;
          donator_name?: string | null;
          id?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method_enum"];
          processed_at?: string | null; // timestamptz
          qr_verification_code?: string | null;
          receipt_number?: string | null;
          receipt_url?: string | null;
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null;
          stripe_session_id?: string | null;
          team_id?: string | null;
          tournee_id?: string | null;
          user_id?: string;
          validated_team_at?: string | null; // timestamptz
          validated_tresorier_at?: string | null; // timestamptz
        };
        Relationships: [
          {
            foreignKeyName: "transactions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_tournee_id_fkey";
            columns: ["tournee_id"];
            isOneToOne: false;
            referencedRelation: "tournees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
     Enums: {
      payment_method_enum: "especes" | "cheque" | "carte" | "virement";
      transaction_status_enum: "pending" | "validated_team" | "validated_tresorier" | "cancelled";
      role_enum: "sapeur" | "chef_equipe" | "tresorier";
      tournee_status_enum: "en_cours" | "pending_validation" | "validated_by_lead" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Le reste du fichier générique pour que les types fonctionnent
type PublicSchema = Database[Extract<keyof Database, "public">];
export type Tables<
  PublicTableNameOrOptions extends | keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends | keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends | keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends | keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

