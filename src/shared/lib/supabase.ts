// src/shared/lib/supabase.ts - Version Self-Hosted
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Configuration pour Supabase Self-Hosted
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// Client Supabase avec configuration adaptée au self-hosted
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Configuration spécifique self-hosted
    flowType: 'pkce', // Plus sécurisé
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  // Configuration réseau pour self-hosted
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  // Timeout plus long pour self-hosted
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper pour vérifier la santé de l'instance Supabase
export const checkSupabaseHealth = async () => {
  try {
    // Test simple de connexion
    const { data, error } = await supabase.from('teams').select('count').limit(1);
    
    if (error) {
      console.error('Supabase health check failed:', error);
      return { healthy: false, error: error.message };
    }
    
    return { healthy: true, error: null };
  } catch (error: any) {
    console.error('Supabase connection error:', error);
    return { healthy: false, error: error.message };
  }
};

// Helper pour les appels authentifiés avec retry
export const getSupabaseSession = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error(`Session error (attempt ${i + 1}):`, error);
        if (i === retries - 1) return null;
        continue;
      }
      
      return session;
    } catch (error) {
      console.error(`Session connection error (attempt ${i + 1}):`, error);
      if (i === retries - 1) return null;
      // Attendre avant retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return null;
};

// Helper pour récupérer le profil utilisateur avec retry
export const getCurrentUserProfile = async () => {
  const session = await getSupabaseSession();
  
  if (!session?.user) {
    return null;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Profile fetch connection error:', error);
    return null;
  }
};

// Type guards pour vérifier les rôles
export const isChefEquipe = (role: string | null) => role === 'chef_equipe';
export const isTresorier = (role: string | null) => role === 'tresorier';
export const isSapeur = (role: string | null) => role === 'sapeur';

// Helper pour debug - à supprimer en production
export const debugSupabaseConfig = () => {
  console.log('Supabase Config:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'None',
  });
};
