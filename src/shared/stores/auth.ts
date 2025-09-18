import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getCurrentUserProfile } from '@/shared/lib/supabase'; // Assurez-vous que les chemins sont corrects
import type { User, Session } from '@supabase/supabase-js';

// Le type UserProfile reste le même
type UserProfile = {
  id: string;
  email: string;
  full_name?: string | null;
  // DB uses 'chef_equipe' with underscore — accept that exact value
  role?: 'sapeur' | 'chef_equipe' | 'tresorier' | null;
  team_id?: string | null;
  is_active?: boolean | null;
  // ... autres champs
};

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  // Return a normalized error message string or null on success
  signIn: (email: string, password: string) => Promise<{ error?: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string | null }>;
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
      isLoading: true,
      isInitialized: false,

      // --- ACTIONS ---

      initialize: async () => {
        // Le listener onAuthStateChange est la seule source de vérité pour l'état
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const profile = await getCurrentUserProfile();
            set({ user: session.user, session, profile, isInitialized: true, isLoading: false });
          } else {
            set({ user: null, session: null, profile: null, isInitialized: true, isLoading: false });
          }
        });
        
        // On récupère la session initiale pour éviter un écran de chargement vide
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
           const profile = await getCurrentUserProfile();
           set({ user: session.user, session, profile, isInitialized: true, isLoading: false });
        } else {
           set({ isInitialized: true, isLoading: false });
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        set({ isLoading: false });
        // Normalize error to string|null so callers get a consistent shape
        if (error) return { error: error.message ?? String(error) };
        return { error: null };
      },

      signUp: async (email, password, fullName) => {
        set({ isLoading: true });
        try {
          // Pass the full name in the signUp options so the Supabase trigger creates the profile server-side
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          });
          // Debug the response
          console.debug('[auth.signUp] supabase.auth.signUp response:', { authData, authError });
          if (authError) throw authError;

          // The DB trigger will create the profile — success
          return { error: null };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[auth.signUp] unexpected error:', message, { error });
          return { error: message };
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        await supabase.auth.signOut();
        // L'état sera mis à jour par onAuthStateChange. La redirection est gérée par le middleware.
        set({ user: null, profile: null, session: null, isLoading: false });
      },
      
      refreshProfile: async () => {
          if (!get().user) return;
          const profile = await getCurrentUserProfile();
          set({ profile });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session, profile: state.profile }),
    }
  )
);
