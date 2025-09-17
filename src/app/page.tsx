// src/app/page.tsx - Nouvelle page d'accueil avec auth moderne
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { toast } from 'react-hot-toast';
import { 
  Mail, 
  Lock, 
  User, 
  Shield, 
  LogIn, 
  UserPlus,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

// Import du dashboard existant (on va le créer juste après)
import { DashboardContent } from '@/app/DashboardContent';

export default function HomePage() {
  const { user, profile, isLoading, isInitialized, signIn, signUp } = useAuthStore();
  
  // États pour le formulaire auth
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Connexion réussie !');
        }
      } else {
        if (!fullName.trim()) {
          toast.error('Nom complet requis');
          setIsSubmitting(false);
          return;
        }
        
        const result = await signUp(email, password, fullName);
        if (result.error) {
          if (result.error.includes('Inscription réussie') || result.error.includes('Vérifiez votre email')) {
            toast.success(result.error);
          } else {
            toast.error(result.error);
          }
        } else {
          toast.success('Compte créé avec succès !');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erreur lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading pendant l'initialisation
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l&apos;application...</p>
        </div>
      </div>
    );
  }

  // Si utilisateur connecté ET actif -> Afficher le dashboard
  if (user && profile?.is_active) {
    return <DashboardContent />;
  }

  // Si utilisateur connecté mais PAS actif -> Rediriger vers pending
  if (user && profile && !profile.is_active) {
    window.location.replace('/pending');
    return null;
  }

  // Si pas connecté -> Afficher la nouvelle interface auth moderne
  return (
    <div className="min-h-screen flex">
      {/* Section Image - Gauche */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 to-red-800 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Sapeurs-Pompiers</h2>
            <p className="text-xl opacity-90 mb-2">Calendriers 2025</p>
            <p className="text-white opacity-75 max-w-md">
              Rejoignez votre &eacute;quipe pour g&eacute;rer efficacement la campagne de collecte
            </p>
          </div>
        </div>
      </div>

      {/* Section Formulaire - Droite */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          
          {/* Header mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendriers SP</h1>
          </div>

          {/* Titre */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'signin' ? 'Bon retour !' : 'Rejoignez-nous'}
            </h2>
            <p className="text-gray-600">
              {mode === 'signin' 
                ? 'Connectez-vous à votre espace personnel'
                : 'Créez votre compte pour commencer'
              }
            </p>
          </div>

          {/* Toggle signin/signup */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Inscription
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nom complet - Inscription seulement */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
                  placeholder="jean.dupont@example.com"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Bouton principal */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Créer mon compte
                </>
              )}
            </button>
          </form>

          {/* Badge dev */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Mode développement</span>
              </div>
              <div className="text-xs text-blue-700">
                <p>Champs pré-remplis pour tests rapides</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}