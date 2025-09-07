// admin-theme.ts - Configuration des thèmes et styles pour l'interface admin
import { spColors, spTailwindClasses } from '../colors';

// Configuration spécifique à l'interface admin
export const adminTheme = {
  // Couleurs spécifiques admin
  colors: {
    // États des données
    status: {
      pending: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
        icon: '⏳'
      },
      validated: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        icon: '✅'
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        icon: '❌'
      },
      draft: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        icon: '📝'
      }
    },
    
    // Types de paiement
    payment: {
      especes: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        icon: '💵'
      },
      cheque: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
        icon: '📝'
      },
      carte: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-300',
        icon: '💳'
      },
      virement: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        icon: '🏦'
      }
    },
    
    // Rôles utilisateurs
    roles: {
      sapeur: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
        icon: '🧑‍🚒'
      },
      chef_equipe: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-300',
        icon: '👨‍💼'
      },
      tresorier: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
        icon: '💰'
      },
      admin: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        icon: '⚙️'
      }
    }
  },
  
  // Espacements et tailles
  spacing: {
    page: {
      padding: 'px-4 sm:px-6 lg:px-8',
      margin: 'mx-auto max-w-7xl'
    },
    section: {
      gap: 'space-y-8',
      marginBottom: 'mb-8'
    },
    card: {
      padding: 'p-6',
      gap: 'space-y-4',
      radius: 'rounded-xl'
    },
    modal: {
      padding: 'p-6',
      radius: 'rounded-xl'
    }
  },
  
  // Typographie
  typography: {
    pageTitle: 'text-2xl sm:text-3xl font-bold text-gray-900',
    sectionTitle: 'text-xl font-semibold text-gray-900',
    cardTitle: 'text-lg font-semibold text-gray-900',
    subtitle: 'text-gray-600',
    body: 'text-gray-700',
    caption: 'text-sm text-gray-500',
    stat: 'text-3xl font-bold text-gray-900',
    statLabel: 'text-sm font-medium text-gray-600'
  },
  
  // Ombres et élévations
  shadows: {
    card: 'shadow-sm hover:shadow-md transition-shadow',
    modal: 'shadow-2xl',
    floating: 'shadow-lg',
    elevated: 'shadow-xl'
  },
  
  // Animations
  animations: {
    fadeIn: 'animate-in fade-in duration-200',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-200',
    hover: 'transform hover:scale-105 transition-transform duration-200'
  },
  
  // Layout responsive
  breakpoints: {
    mobile: 'block sm:hidden',
    tablet: 'hidden sm:block lg:hidden',
    desktop: 'hidden lg:block',
    mobileUp: 'sm:block',
    tabletUp: 'lg:block'
  }
} as const;

// Utilitaires pour récupérer les styles
export const getStatusStyle = (status: keyof typeof adminTheme.colors.status) => {
  return adminTheme.colors.status[status] || adminTheme.colors.status.draft;
};

export const getPaymentStyle = (method: keyof typeof adminTheme.colors.payment) => {
  return adminTheme.colors.payment[method] || adminTheme.colors.payment.especes;
};

export const getRoleStyle = (role: keyof typeof adminTheme.colors.roles) => {
  return adminTheme.colors.roles[role] || adminTheme.colors.roles.sapeur;
};

// Fonction pour créer des badges avec les bonnes couleurs
export const createStatusBadge = (
  status: string, 
  customText?: string
): { text: string; className: string; icon: string } => {
  const statusKey = status as keyof typeof adminTheme.colors.status;
  const style = getStatusStyle(statusKey);
  
  const displayText = customText || {
    pending: 'En attente',
    validated: 'Validé', 
    rejected: 'Rejeté',
    draft: 'Brouillon'
  }[statusKey] || status;
  
  return {
    text: displayText,
    className: `inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`,
    icon: style.icon
  };
};

// Classes CSS communes réutilisables
export const adminClassNames = {
  // Layout
  page: `min-h-screen bg-gray-50`,
  pageHeader: `bg-white border-b border-gray-200 sticky top-0 z-10`,
  pageContent: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8`,
  
  // Cards
  card: `bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200`,
  cardHover: `hover:shadow-md hover:border-gray-300`,
  cardHeader: `p-6 pb-4 border-b border-gray-200`,
  cardBody: `p-6 space-y-4`,
  cardFooter: `p-6 pt-4 bg-gray-50 rounded-b-xl border-t border-gray-200`,
  
  // Forms
  formGroup: `space-y-2`,
  formRow: `grid grid-cols-1 md:grid-cols-2 gap-4`,
  formActions: `flex gap-3 pt-6`,
  
  // Tables
  table: `min-w-full divide-y divide-gray-200`,
  tableHeader: `bg-gray-50`,
  tableCell: `px-6 py-4 whitespace-nowrap text-sm`,
  tableRow: `hover:bg-gray-50 transition-colors`,
  
  // Buttons
  btnPrimary: `bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors`,
  btnSecondary: `bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-lg transition-colors`,
  btnDanger: `bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors`,
  
  // Loading states
  spinner: `w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin`,
  skeleton: `bg-gray-200 animate-pulse rounded`,
  
  // Empty states
  emptyState: `flex flex-col items-center justify-center h-64 p-8 text-center`,
  emptyIcon: `text-6xl mb-4 text-gray-300`,
  emptyText: `text-gray-500`
} as const;