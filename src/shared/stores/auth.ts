// src/shared/stores/auth.ts - Avec redirection automatique
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getCurrentUserProfile } from '@/shared/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
// import type { Database } from '@/shared/types/database';

// Types pour le store auth
// Use a relaxed profile type to accept nullable DB fields returned by Supabase
type UserProfile = {
  id: string;
  email: string;
  full_name?: string | null;
  role: 'sapeur' | 'chef_equipe' | 'tresorier';
  team_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

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

// Helper pour redirection basée sur le rôle
const redirectByRole = (profile: UserProfile | null, event?: string) => {
  // If running on server (SSR) we disable redirects
  if (typeof window === 'undefined') {
    console.log('🔧 REDIRECTION DÉSACTIVÉE POUR SSR/TEST', { hasProfile: !!profile, event });
    return;
  }

  // Narrow: if no profile present, nothing to do
  if (!profile) return;

  const currentPath = window.location.pathname;


  // Si utilisateur non actif, rediriger vers page d'attente
  if (profile.is_active !== undefined && profile.is_active === false) {
    if (!currentPath.startsWith('/pending')) {
      console.log('⏳ Redirecting inactive user to pending page');
      window.location.replace('/pending');
      return;
    }
  }

  if (profile.role === 'tresorier' && profile.is_active === true) {
    // ✨ SEULEMENT rediriger lors de la première connexion ou du refresh
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (!currentPath.startsWith('/admin')) {
        console.log('🏛️ Redirecting treasurer to admin dashboard');
        window.location.replace('/admin');
      }
    }
  } else if (profile.is_active === true) {
    // Non-trésorier actif : bloquer l'accès admin
    if (currentPath.startsWith('/admin')) {
      console.log('🚫 Redirecting non-treasurer away from admin');
      window.location.replace('/');
    }
  }
};

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

            // ✨ REDIRECTION SEULEMENT AU PREMIER CHARGEMENT
            // DISABLED: setTimeout(() => redirectByRole(profile, 'INITIAL_SESSION'), 100);
            
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

              // ✨ REDIRECTION SEULEMENT LORS DE LA CONNEXION
              if (event === 'SIGNED_IN') {
                // DISABLED: setTimeout(() => redirectByRole(profile, 'SIGNED_IN'), 100);
              }
              
            } else {
              set({
                user: null,
                session: null,
                profile: null,
                isLoading: false,
              });
            }
          });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error('Auth initialization error:', msg);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Connexion
      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true });

          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }

          // La redirection sera gérée par onAuthStateChange
          return {};
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          set({ isLoading: false });
          return { error: msg || 'Erreur de connexion' };
        }
      },

      // Inscription
      signUp: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null } as unknown as Partial<AuthState>);
        try {
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });

          if (authError) {
            throw new Error(authError.message);
          }

          // If user created in auth, insert profile with is_active=false
          if (authData?.user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                full_name: fullName.trim(),
                email: email.trim(),
                is_active: false,
              });

            if (profileError) {
              // Try to cleanup the orphan auth user if profile creation failed
              try {
                await supabase.auth.admin.deleteUser(authData.user.id);
              } catch (cleanupError) {
                console.error('Failed to cleanup orphan user after profile insert failure:', cleanupError);
              }

              throw new Error(profileError.message);
            }
          }

          // Let the onAuthStateChange listener handle subsequent state updates
          return { error: undefined };
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          return { error: msg };
        } finally {
          set({ isLoading: false } as unknown as Partial<AuthState>);
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
          
          // Reset du state et redirection vers accueil
          set({ 
            user: null, 
            profile: null, 
            session: null, 
            isLoading: false 
          });

          // Rediriger vers la page d'accueil après déconnexion
          if (typeof window !== 'undefined') {
            window.location.replace('/');
          }
          
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error('Signout error:', msg);
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
          
          // Vérifier si redirection nécessaire après refresh du profil (seulement si changement de rôle)
          const currentProfile = get().profile;
          if (currentProfile?.role !== profile?.role) {
            // DISABLED: setTimeout(() => redirectByRole(profile, 'ROLE_CHANGE'), 100);
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error('Error refreshing profile:', msg);
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
