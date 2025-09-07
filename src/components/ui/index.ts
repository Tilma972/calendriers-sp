// Design System UI Components - Calendriers Sapeurs-Pompiers
// Barrel exports pour tous les composants du design system

// Components
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card';

export { Input, Textarea } from './Input';
export type { InputProps, TextareaProps } from './Input';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

// Colors and design tokens
export { 
  spColors, 
  spTailwindClasses, 
  getSPColor, 
  getSPTailwindClass 
} from './colors';

// Re-export utility function
export { cn } from '@/shared/lib/utils';