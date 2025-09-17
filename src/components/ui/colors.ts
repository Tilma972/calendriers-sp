// Design System Colors - Calendriers Sapeurs-Pompiers
// Basé sur l'identité visuelle des Sapeurs-Pompiers de France

export const spColors = {
  // Couleurs principales SP
  primary: {
    50: '#fef2f2',   // Rouge très clair
    100: '#fee2e2',  // Rouge clair
    200: '#fecaca',  // Rouge doux
    300: '#fca5a5',  // Rouge moyen clair
    400: '#f87171',  // Rouge moyen
    500: '#ef4444',  // Rouge standard
    600: '#dc2626',  // Rouge principal SP
    700: '#b91c1c',  // Rouge foncé
    800: '#991b1b',  // Rouge très foncé professionnel
    900: '#7f1d1d',  // Rouge sombre
  },
  
  // Couleurs secondaires
  secondary: {
    50: '#f9fafb',   // Gris très clair
    100: '#f3f4f6',  // Gris clair
    200: '#e5e7eb',  // Gris doux
    300: '#d1d5db',  // Gris moyen clair
    400: '#9ca3af',  // Gris moyen
    500: '#6b7280',  // Gris standard
    600: '#4b5563',  // Gris foncé
    700: '#374151',  // Gris anthracite SP
    800: '#1f2937',  // Gris très foncé
    900: '#111827',  // Gris sombre
  },
  
  // Couleur accent (Orange premium)
  accent: {
    50: '#fffbeb',   // Orange très clair
    100: '#fef3c7',  // Orange clair
    200: '#fde68a',  // Orange doux
    300: '#fcd34d',  // Orange moyen clair
    400: '#fbbf24',  // Orange moyen
    500: '#f59e0b',  // Orange premium SP
    600: '#d97706',  // Orange foncé
    700: '#b45309',  // Orange très foncé
    800: '#92400e',  // Orange sombre
    900: '#78350f',  // Orange très sombre
  },
  
  // Couleur succès (Vert foncé professionnel)
  success: {
    50: '#ecfdf5',   // Vert très clair
    100: '#d1fae5',  // Vert clair
    200: '#a7f3d0',  // Vert doux
    300: '#6ee7b7',  // Vert moyen clair
    400: '#34d399',  // Vert moyen
    500: '#10b981',  // Vert standard
    600: '#059669',  // Vert foncé SP
    700: '#047857',  // Vert très foncé
    800: '#065f46',  // Vert sombre
    900: '#064e3b',  // Vert très sombre
  },
  
  // États et notifications
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  }
} as const;

// Classes Tailwind CSS correspondantes (à utiliser dans les composants)
export const spTailwindClasses = {
  // Backgrounds
  bg: {
    primary: {
      DEFAULT: 'bg-red-600',    // --primary: #dc2626
      light: 'bg-red-50',
      dark: 'bg-red-800',
    },
    secondary: {
      DEFAULT: 'bg-gray-700',   // --secondary: #374151
      light: 'bg-gray-100',
      dark: 'bg-gray-800',
    },
    accent: {
      DEFAULT: 'bg-amber-500',  // --accent: #f59e0b
      light: 'bg-amber-50',
      dark: 'bg-amber-600',
    },
    success: {
      DEFAULT: 'bg-emerald-600', // --success: #059669
      light: 'bg-emerald-50',
      dark: 'bg-emerald-700',
    }
  },
  
  // Text colors
  text: {
    primary: {
      DEFAULT: 'text-red-600',
      light: 'text-red-400',
      dark: 'text-red-800',
    },
    secondary: {
      DEFAULT: 'text-gray-700',
      light: 'text-gray-500',
      dark: 'text-gray-800',
    },
    accent: {
      DEFAULT: 'text-amber-500',
      light: 'text-amber-400',
      dark: 'text-amber-600',
    },
    success: {
      DEFAULT: 'text-emerald-600',
      light: 'text-emerald-500',
      dark: 'text-emerald-700',
    }
  },
  
  // Border colors
  border: {
    primary: {
      DEFAULT: 'border-red-600',
      light: 'border-red-200',
      dark: 'border-red-800',
    },
    secondary: {
      DEFAULT: 'border-gray-300',
      light: 'border-gray-200',
      dark: 'border-gray-400',
    },
    accent: {
      DEFAULT: 'border-amber-500',
      light: 'border-amber-200',
      dark: 'border-amber-600',
    },
    success: {
      DEFAULT: 'border-emerald-600',
      light: 'border-emerald-200',
      dark: 'border-emerald-700',
    }
  },
  
  // Focus ring colors
  ring: {
    primary: 'focus:ring-red-500',
    secondary: 'focus:ring-gray-500', 
    accent: 'focus:ring-amber-500',
    success: 'focus:ring-emerald-500',
  }
} as const;

// Utilitaires pour récupérer les couleurs
export const getSPColor = (color: keyof typeof spColors, shade: keyof typeof spColors.primary = 600) => {
  return spColors[color][shade];
};

export const getSPTailwindClass = (type: 'bg' | 'text' | 'border', color: 'primary' | 'secondary' | 'accent' | 'success', variant: 'DEFAULT' | 'light' | 'dark' = 'DEFAULT') => {
  return spTailwindClasses[type][color][variant];
};