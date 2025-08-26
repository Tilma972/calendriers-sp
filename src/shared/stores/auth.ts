// src/shared/stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getCurrentUserProfile } from '@/shared/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Types pour le store auth
type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  // État
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isInitialized: false,

      // Initialiser l'auth au démarrage de l'app
      initialize: async () => {
        try {
          set({ isLoading: true });

          // Récupérer la session actuelle
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Error getting session:', sessionError);
            set({ isLoading: false, isInitialized: true });
            return;
          }

          if (session?.user) {
            // Récupérer le profil utilisateur
            const profile = await getCurrentUserProfile();
            
            set({
              user: session.user,
              session,
              profile,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({ 
              user: null, 
              session: null, 
              profile: null, 
              isLoading: false, 
              isInitialized: true 
            });
          }

          // Écouter les changements d'auth
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email);

            if (session?.user) {
              const profile = await getCurrentUserProfile();
              set({
                user: session.user,
                session,
                profile,
                isLoading: false,
              });
            } else {
              set({
                user: null,
                session: null,
                profile: null,
                isLoading: false,
              });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Connexion
      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true });

          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }

          // Le profil sera chargé automatiquement via onAuthStateChange
          return {};
        } catch (error: any) {
          set({ isLoading: false });
          return { error: error.message || 'Erreur de connexion' };
        }
      },

      // Inscription
      signUp: async (email: string, password: string, fullName: string) => {
        try {
          set({ isLoading: true });

          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }

          // Si signup réussi mais confirmation email requise
          if (data.user && !data.session) {
            set({ isLoading: false });
            return { error: 'Vérifiez votre email pour confirmer votre compte' };
          }

          return {};
        } catch (error: any) {
          set({ isLoading: false });
          return { error: error.message || 'Erreur d\'inscription' };
        }
      },

      // Déconnexion
      signOut: async () => {
        try {
          set({ isLoading: true });
          
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error('Signout error:', error);
          }
          
          // Reset du state (sera fait automatiquement via onAuthStateChange)
          set({ 
            user: null, 
            profile: null, 
            session: null, 
            isLoading: false 
          });
        } catch (error) {
          console.error('Signout error:', error);
          set({ isLoading: false });
        }
      },

      // Rafraîchir le profil utilisateur
      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const profile = await getCurrentUserProfile();
          set({ profile });
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      // Ne persister que les données essentielles (pas les fonctions)
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
      }),
    }
  )
);