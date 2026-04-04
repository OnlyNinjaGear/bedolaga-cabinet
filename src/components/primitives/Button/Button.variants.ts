import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90',
          'active:bg-primary/90',
          'shadow-linear-sm hover:shadow-linear',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'border border-border',
          'hover:bg-secondary/80',
          'active:bg-secondary',
        ],
        ghost: ['text-muted-foreground', 'hover:text-foreground hover:bg-muted', 'active:bg-muted'],
        destructive: [
          'bg-destructive/10 text-destructive',
          'border border-destructive/20',
          'hover:bg-destructive/20 hover:border-destructive/30',
          'active:bg-destructive/30',
        ],
        outline: [
          'border border-border text-foreground bg-background',
          'hover:bg-muted hover:text-foreground',
          'active:bg-muted',
        ],
        link: ['text-primary', 'hover:text-primary/70 hover:underline', 'active:text-primary'],
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-linear',
        md: 'h-10 px-4 text-sm rounded-linear',
        lg: 'h-12 px-6 text-base rounded-linear-lg',
        icon: 'h-10 w-10 rounded-linear',
        'icon-sm': 'h-8 w-8 rounded-linear',
        'icon-lg': 'h-12 w-12 rounded-linear-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
