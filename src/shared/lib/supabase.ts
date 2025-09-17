// src/shared/lib/supabase.ts - Version finale et sécurisée
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Déclaration pour le singleton
declare global {
  var _supabaseClient: SupabaseClient<Database> | undefined;
  var _supabaseAdmin: SupabaseClient<Database> | undefined;
}

// Variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// --- Client Supabase pour le Navigateur (Client-Side) ---
// Ce client utilise la clé "anon" et est sûr à utiliser partout.
if (!global._supabaseClient) {
  global._supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: { headers: { 'Content-Type': 'application/json' } },
  });
}
export const supabase = global._supabaseClient;


// --- Client Supabase Admin pour le Serveur (Server-Side) ---
// Ce client utilise la clé secrète "service_role" et ne doit JAMAIS être importé
// ou utilisé dans un composant client ('use client').
let supabaseAdmin: SupabaseClient<Database> | null = null;

// Cette vérification s'assure que le code ne s'exécute que côté serveur.
if (typeof window === 'undefined') {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY manquante. Les opérations Admin/Storage ne fonctionneront pas.');
  } else {
    if (!global._supabaseAdmin) {
      global._supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    supabaseAdmin = global._supabaseAdmin;
  }
}

export { supabaseAdmin };

// Helpers existants (gardez vos fonctions actuelles)
export const checkSupabaseHealth = async () => {
  try {
    const { data, error } = await supabase.from('teams').select('count').limit(1);
    if (error) {
      console.error('Supabase health check failed:', error);
      return { healthy: false, error: error.message };
    }
    return { healthy: true, error: null };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Supabase connection error:', error);
      return { healthy: false, error: error.message };
    }
    console.error('Supabase connection error:', String(error));
    return { healthy: false, error: String(error) };
  }
};

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Session connection error (attempt ${i + 1}):`, error);
      } else {
        console.error(`Session connection error (attempt ${i + 1}):`, String(error));
      }
      if (i === retries - 1) return null;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
};

export const getCurrentUserProfile = async () => {
  const session = await getSupabaseSession();
  if (!session?.user) return null;

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Profile fetch connection error:', error);
    } else {
      console.error('Profile fetch connection error:', String(error));
    }
    return null;
  }
};

// Type guards
export const isChefEquipe = (role: string | null) => role === 'chef_equipe';
export const isTresorier = (role: string | null) => role === 'tresorier';
export const isSapeur = (role: string | null) => role === 'sapeur';

// Debug helper
export const debugSupabaseConfig = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('🔍 Supabase Config:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    anonKeyPreview: supabaseAnonKey?.substring(0, 20) + '...',
    serviceKeyPreview: supabaseServiceKey?.substring(0, 20) + '...',
    supabaseAdminAvailable: !!supabaseAdmin
  });
};
