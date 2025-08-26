// src/shared/types/database.ts
// Types générés automatiquement depuis votre schéma Supabase

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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'sapeur' | 'chef_equipe' | 'tresorier'
          team_id: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'sapeur' | 'chef_equipe' | 'tresorier'
          team_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'sapeur' | 'chef_equipe' | 'tresorier'
          team_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          chef_id: string | null
          calendars_target: number
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          chef_id?: string | null
          calendars_target?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          chef_id?: string | null
          calendars_target?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournees: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          started_at: string
          ended_at: string | null
          calendars_initial: number
          calendars_remaining: number | null
          calendars_distributed: number | null
          total_amount: number
          total_transactions: number
          status: 'en_cours' | 'pending_validation' | 'validated_by_lead' | 'completed'
          notes: string | null
          validated_by: string | null
          validated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          started_at?: string
          ended_at?: string | null
          calendars_initial: number
          calendars_remaining?: number | null
          total_amount?: number
          total_transactions?: number
          status?: 'en_cours' | 'pending_validation' | 'validated_by_lead' | 'completed'
          notes?: string | null
          validated_by?: string | null
          validated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          started_at?: string
          ended_at?: string | null
          calendars_initial?: number
          calendars_remaining?: number | null
          total_amount?: number
          total_transactions?: number
          status?: 'en_cours' | 'pending_validation' | 'validated_by_lead' | 'completed'
          notes?: string | null
          validated_by?: string | null
          validated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          tournee_id: string | null
          amount: number
          calendars_given: number
          payment_method: 'especes' | 'cheque' | 'carte' | 'virement'
          donator_email: string | null
          donator_name: string | null
          donator_address: string | null
          status: 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled'
          receipt_number: string | null
          receipt_url: string | null
          stripe_session_id: string | null
          notes: string | null
          created_at: string
          validated_team_at: string | null
          validated_tresorier_at: string | null
          qr_verification_code: string | null
          idempotency_key: string | null
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          tournee_id?: string | null
          amount: number
          calendars_given?: number
          payment_method: 'especes' | 'cheque' | 'carte' | 'virement'
          donator_email?: string | null
          donator_name?: string | null
          donator_address?: string | null
          status?: 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled'
          receipt_number?: string | null
          receipt_url?: string | null
          stripe_session_id?: string | null
          notes?: string | null
          created_at?: string
          validated_team_at?: string | null
          validated_tresorier_at?: string | null
          qr_verification_code?: string | null
          idempotency_key?: string | null
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          tournee_id?: string | null
          amount?: number
          calendars_given?: number
          payment_method?: 'especes' | 'cheque' | 'carte' | 'virement'
          donator_email?: string | null
          donator_name?: string | null
          donator_address?: string | null
          status?: 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled'
          receipt_number?: string | null
          receipt_url?: string | null
          stripe_session_id?: string | null
          notes?: string | null
          created_at?: string
          validated_team_at?: string | null
          validated_tresorier_at?: string | null
          qr_verification_code?: string | null
          idempotency_key?: string | null
          processed_at?: string | null
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
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      v_sapeur_dashboard: {
        Row: {
          tournee_id: string | null
          user_id: string | null
          full_name: string | null
          team_id: string | null
          team_name: string | null
          team_color: string | null
          calendars_initial: number | null
          calendars_distributed: number | null
          calendars_remaining: number | null
          total_amount: number | null
          total_transactions: number | null
          started_at: string | null
          status: string | null
          dons_aujourd_hui: number | null
          montant_aujourd_hui: number | null
        }
        Relationships: []
      }
      v_teams_leaderboard: {
        Row: {
          id: string | null
          name: string | null
          color: string | null
          calendars_target: number | null
          nb_tournees_actives: number | null
          total_transactions: number | null
          total_collecte: number | null
          total_calendriers_distribues: number | null
          pourcentage_objectif: number | null
          rang_global: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      start_new_tournee: {
        Args: {
          p_user_id: string
          p_calendars_initial: number
        }
        Returns: string
      }
      end_tournee: {
        Args: {
          p_tournee_id: string
          p_calendars_remaining: number
        }
        Returns: boolean
      }
    }
    Enums: {
      payment_method_enum: 'especes' | 'cheque' | 'carte' | 'virement'
      role_enum: 'sapeur' | 'chef_equipe' | 'tresorier'
      transaction_status_enum: 'pending' | 'validated_team' | 'validated_tresorier' | 'cancelled'
      tournee_status_enum: 'en_cours' | 'pending_validation' | 'validated_by_lead' | 'completed'
    }
  }
}