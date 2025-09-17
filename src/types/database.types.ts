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
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          email_provider: string | null
          email_subject: string | null
          email_to: string
          error_message: string | null
          id: string
          opened_at: string | null
          receipt_number: string | null
          sent_at: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_provider?: string | null
          email_subject?: string | null
          email_to: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          receipt_number?: string | null
          sent_at?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_provider?: string | null
          email_subject?: string | null
          email_to?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          receipt_number?: string | null
          sent_at?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_chef_validation_queue"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "email_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transactions_export"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          association_address: string | null
          association_name: string | null
          association_rna: string | null
          association_siren: string | null
          created_at: string | null
          enable_pdf_generation: boolean | null
          enable_tracking: boolean | null
          id: number
          legal_text: string | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          template_version: string | null
          updated_at: string | null
        }
        Insert: {
          association_address?: string | null
          association_name?: string | null
          association_rna?: string | null
          association_siren?: string | null
          created_at?: string | null
          enable_pdf_generation?: boolean | null
          enable_tracking?: boolean | null
          id?: number
          legal_text?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          template_version?: string | null
          updated_at?: string | null
        }
        Update: {
          association_address?: string | null
          association_name?: string | null
          association_rna?: string | null
          association_siren?: string | null
          created_at?: string | null
          enable_pdf_generation?: boolean | null
          enable_tracking?: boolean | null
          id?: number
          legal_text?: string | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          template_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["role_enum"]
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["role_enum"]
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["role_enum"]
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_qr_stats_by_team"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_interactions: {
        Row: {
          amount: number | null
          calendars_count: number | null
          completed_at: string | null
          created_at: string | null
          donator_email: string | null
          donator_name: string | null
          expires_at: string | null
          id: string
          interaction_id: string
          ip_address: unknown | null
          status: string | null
          stripe_session_id: string | null
          team_id: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          amount?: number | null
          calendars_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          donator_email?: string | null
          donator_name?: string | null
          expires_at?: string | null
          id?: string
          interaction_id: string
          ip_address?: unknown | null
          status?: string | null
          stripe_session_id?: string | null
          team_id: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          amount?: number | null
          calendars_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          donator_email?: string | null
          donator_name?: string | null
          expires_at?: string | null
          id?: string
          interaction_id?: string
          ip_address?: unknown | null
          status?: string | null
          stripe_session_id?: string | null
          team_id?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_interactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_interactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_qr_stats_by_team"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "qr_interactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          default_team_target: number
          global_calendars_target: number
          id: number
          max_calendars_per_transaction: number
          notification_emails: string[] | null
          primary_color: string | null
          sync_frequency_minutes: number
        }
        Insert: {
          default_team_target?: number
          global_calendars_target?: number
          id?: number
          max_calendars_per_transaction?: number
          notification_emails?: string[] | null
          primary_color?: string | null
          sync_frequency_minutes?: number
        }
        Update: {
          default_team_target?: number
          global_calendars_target?: number
          id?: number
          max_calendars_per_transaction?: number
          notification_emails?: string[] | null
          primary_color?: string | null
          sync_frequency_minutes?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          calendars_target: number | null
          chef_id: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
          stripe_payment_link_url: string | null
          updated_at: string | null
        }
        Insert: {
          calendars_target?: number | null
          chef_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          stripe_payment_link_url?: string | null
          updated_at?: string | null
        }
        Update: {
          calendars_target?: number | null
          chef_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          stripe_payment_link_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "v_sapeurs_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tournees: {
        Row: {
          calendars_distributed: number | null
          calendars_initial: number
          calendars_remaining: number | null
          created_at: string | null
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["tournee_status_enum"] | null
          team_id: string | null
          total_amount: number | null
          total_transactions: number | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          calendars_distributed?: number | null
          calendars_initial: number
          calendars_remaining?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["tournee_status_enum"] | null
          team_id?: string | null
          total_amount?: number | null
          total_transactions?: number | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          calendars_distributed?: number | null
          calendars_initial?: number
          calendars_remaining?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["tournee_status_enum"] | null
          team_id?: string | null
          total_amount?: number | null
          total_transactions?: number | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_qr_stats_by_team"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_sapeurs_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tournees_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "v_sapeurs_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          calendars_given: number | null
          cheque_banque: string | null
          cheque_date_emission: string | null
          cheque_deposited_at: string | null
          cheque_numero: string | null
          cheque_tireur: string | null
          created_at: string | null
          donator_address: string | null
          donator_email: string | null
          donator_name: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          processed_at: string | null
          qr_verification_code: string | null
          receipt_generated_at: string | null
          receipt_metadata: Json | null
          receipt_number: string | null
          receipt_requested_at: string | null
          receipt_status:
            | Database["public"]["Enums"]["receipt_status_enum"]
            | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["transaction_status_enum"] | null
          stripe_session_id: string | null
          team_id: string | null
          tournee_id: string | null
          user_id: string
          validated_team_at: string | null
          validated_tresorier_at: string | null
        }
        Insert: {
          amount: number
          calendars_given?: number | null
          cheque_banque?: string | null
          cheque_date_emission?: string | null
          cheque_deposited_at?: string | null
          cheque_numero?: string | null
          cheque_tireur?: string | null
          created_at?: string | null
          donator_address?: string | null
          donator_email?: string | null
          donator_name?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          processed_at?: string | null
          qr_verification_code?: string | null
          receipt_generated_at?: string | null
          receipt_metadata?: Json | null
          receipt_number?: string | null
          receipt_requested_at?: string | null
          receipt_status?:
            | Database["public"]["Enums"]["receipt_status_enum"]
            | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null
          stripe_session_id?: string | null
          team_id?: string | null
          tournee_id?: string | null
          user_id: string
          validated_team_at?: string | null
          validated_tresorier_at?: string | null
        }
        Update: {
          amount?: number
          calendars_given?: number | null
          cheque_banque?: string | null
          cheque_date_emission?: string | null
          cheque_deposited_at?: string | null
          cheque_numero?: string | null
          cheque_tireur?: string | null
          created_at?: string | null
          donator_address?: string | null
          donator_email?: string | null
          donator_name?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          processed_at?: string | null
          qr_verification_code?: string | null
          receipt_generated_at?: string | null
          receipt_metadata?: Json | null
          receipt_number?: string | null
          receipt_requested_at?: string | null
          receipt_status?:
            | Database["public"]["Enums"]["receipt_status_enum"]
            | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null
          stripe_session_id?: string | null
          team_id?: string | null
          tournee_id?: string | null
          user_id?: string
          validated_team_at?: string | null
          validated_tresorier_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_qr_stats_by_team"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "v_chef_validation_queue"
            referencedColumns: ["tournee_id"]
          },
          {
            foreignKeyName: "transactions_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "v_sapeur_dashboard"
            referencedColumns: ["tournee_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_sapeurs_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      email_stats: {
        Row: {
          bounced_sent: number | null
          clicked_count: number | null
          date_sent: string | null
          failed_sent: number | null
          open_rate_percent: number | null
          opened_count: number | null
          successful_sent: number | null
          total_sent: number | null
        }
        Relationships: []
      }
      v_chef_validation_queue: {
        Row: {
          amount: number | null
          calendars_given: number | null
          created_at: string | null
          donator_name: string | null
          notes: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          sapeur_name: string | null
          team_name: string | null
          tournee_debut: string | null
          tournee_id: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_sapeurs_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_qr_stats_by_team: {
        Row: {
          completed_interactions: number | null
          conversion_rate: number | null
          expired_interactions: number | null
          pending_interactions: number | null
          team_color: string | null
          team_id: string | null
          team_name: string | null
          total_amount_qr: number | null
          total_interactions: number | null
        }
        Relationships: []
      }
      v_sapeur_dashboard: {
        Row: {
          calendars_distributed: number | null
          calendars_initial: number | null
          calendars_remaining: number | null
          dons_aujourd_hui: number | null
          full_name: string | null
          montant_aujourd_hui: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["tournee_status_enum"] | null
          team_color: string | null
          team_id: string | null
          team_name: string | null
          total_amount: number | null
          total_transactions: number | null
          tournee_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_qr_stats_by_team"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_sapeurs_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_sapeurs_leaderboard: {
        Row: {
          don_moyen: number | null
          dons_aujourd_hui: number | null
          dons_semaine: number | null
          full_name: string | null
          montant_aujourd_hui: number | null
          nb_transactions: number | null
          rang_equipe: number | null
          rang_global: number | null
          team_color: string | null
          team_id: string | null
          team_name: string | null
          total_calendriers: number | null
          total_collecte: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_qr_stats_by_team"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_teams_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_teams_leaderboard: {
        Row: {
          calendars_target: number | null
          color: string | null
          id: string | null
          name: string | null
          nb_tournees_actives: number | null
          pourcentage_objectif: number | null
          rang_global: number | null
          total_calendriers_distribues: number | null
          total_collecte: number | null
          total_transactions: number | null
        }
        Relationships: []
      }
      v_transactions_export: {
        Row: {
          date_don: string | null
          date_validation_equipe: string | null
          date_validation_tresorier: string | null
          donateur_email: string | null
          donateur_nom: string | null
          equipe_nom: string | null
          id: string | null
          mode_paiement:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          montant: number | null
          nb_calendriers: number | null
          notes: string | null
          receipt_number: string | null
          sapeur_email: string | null
          sapeur_nom: string | null
          statut: Database["public"]["Enums"]["transaction_status_enum"] | null
        }
        Relationships: []
      }
      v_tresorier_dashboard: {
        Row: {
          calendriers_distribues: number | null
          montant_aujourd_hui: number | null
          montant_semaine: number | null
          montant_total_collecte: number | null
          nb_equipes_actives: number | null
          nb_sapeurs_actifs: number | null
          nb_tournees_actives: number | null
          nb_transactions_totales: number | null
          validations_equipe_attente: number | null
          validations_tresorier_attente: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_qr_interactions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      complete_qr_interaction: {
        Args: {
          donator_email_param?: string
          donator_name_param?: string
          interaction_id_param: string
          stripe_session_id_param: string
        }
        Returns: {
          success: boolean
          team_id: string
          team_name: string
          transaction_id: string
        }[]
      }
      end_tournee: {
        Args: { p_calendars_remaining: number; p_tournee_id: string }
        Returns: boolean
      }
      generate_qr_interaction_id: {
        Args: { team_uuid: string }
        Returns: string
      }
      get_transaction_for_receipt: {
        Args: { transaction_id: string }
        Returns: {
          amount: number
          calendars_given: number
          created_at: string
          donator_email: string
          donator_name: string
          id: string
          notes: string
          payment_method: string
          sapeur_name: string
          team_id: string
          team_name: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_team: {
        Args: { user_id: string }
        Returns: string
      }
      initiate_qr_interaction: {
        Args: {
          ip_address_param?: unknown
          team_uuid: string
          user_agent_param?: string
        }
        Returns: {
          expires_at: string
          interaction_id: string
          stripe_payment_link_url: string
        }[]
      }
      is_chef_equipe: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_tresorier: {
        Args: { user_id: string }
        Returns: boolean
      }
      start_new_tournee: {
        Args: { p_calendars_initial: number; p_user_id: string }
        Returns: string
      }
      update_receipt_number: {
        Args: { receipt_num: string; transaction_id: string }
        Returns: boolean
      }
      update_tournee_totals: {
        Args: { p_tournee_id: string }
        Returns: undefined
      }
    }
    Enums: {
      payment_method_enum:
        | "especes"
        | "cheque"
        | "carte"
        | "virement"
        | "especes_batch"
        | "carte_qr"
      receipt_status_enum: "pending" | "generated" | "failed" | "cancelled"
      role_enum: "sapeur" | "chef_equipe" | "tresorier"
      tournee_status_enum:
        | "en_cours"
        | "pending_validation"
        | "validated_by_lead"
        | "completed"
      transaction_status_enum:
        | "pending"
        | "validated_team"
        | "validated_tresorier"
        | "cancelled"
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
      payment_method_enum: [
        "especes",
        "cheque",
        "carte",
        "virement",
        "especes_batch",
        "carte_qr",
      ],
      receipt_status_enum: ["pending", "generated", "failed", "cancelled"],
      role_enum: ["sapeur", "chef_equipe", "tresorier"],
      tournee_status_enum: [
        "en_cours",
        "pending_validation",
        "validated_by_lead",
        "completed",
      ],
      transaction_status_enum: [
        "pending",
        "validated_team",
        "validated_tresorier",
        "cancelled",
      ],
    },
  },
} as const

