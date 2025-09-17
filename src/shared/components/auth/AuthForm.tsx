// src/shared/components/auth/AuthForm.tsx - Version avec debug
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { supabase, checkSupabaseHealth, debugSupabaseConfig } from '@/shared/lib/supabase';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const [email, setEmail] = useState('test@example.com'); // Pré-rempli pour test
  const [password, setPassword] = useState('password123'); // Pré-rempli pour test
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  
  const { signIn, signUp, isLoading } = useAuthStore();

  // Test de santé Supabase
  const handleHealthCheck = async () => {
    console.log('🔍 Testing Supabase health...');
    debugSupabaseConfig();
    
    const health = await checkSupabaseHealth();
    setDebugInfo(health);
    
    // Test direct API auth
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Current session:', data, error);
      
      // Test direct de connexion
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });
      
      console.log('Direct sign in test:', { signInData, signInError });
      
      setDebugInfo({
        ...health,
        session: data,
        directSignIn: { data: signInData, error: signInError?.message }
      });
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Auth test error:', message);
      setDebugInfo({
        ...health,
        authError: message
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);

    console.log('🚀 Form submission:', { mode, email });

    if (mode === 'signin') {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        console.error('SignIn error:', result.error);
      }
    } else {
      if (!fullName.trim()) {
        setError('Nom complet requis');
        return;
      }
      
      const result = await signUp(email, password, fullName);
      if (result.error) {
        setError(result.error);
        console.error('SignUp error:', result.error);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🔥</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">
            Calendriers SP
          </h1>
          <p className="text-red-600">
            {mode === 'signin' ? 'Connexion à votre compte' : 'Créer un compte'}
          </p>
        </div>

        {/* Debug Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleHealthCheck}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm"
          >
            🔍 Test Connexion Supabase
          </button>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 p-4 bg-gray-50 border rounded-md">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Jean Dupont"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="jean.dupont@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="••••••••"
              minLength={6}
              required
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 caractères
              </p>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            {mode === 'signin' 
              ? "Pas encore de compte ? Créer un compte"
              : "Déjà un compte ? Se connecter"
            }
          </button>
        </div>

        {/* Info développement */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            🧪 Mode Développement
          </h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Test:</strong> test@example.com / password123</p>
            <p>Champs pré-remplis pour test rapide</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook pour gérer le mode auth
export function useAuthMode() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  return { mode, toggleMode };
}