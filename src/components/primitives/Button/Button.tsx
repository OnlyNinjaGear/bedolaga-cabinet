import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { buttonTap, buttonHover, springTransition } from '../../motion/transitions';
import { buttonVariants, type ButtonVariants } from './Button.variants';
import { Button as ShadcnButton } from '@/components/ui/button';

type ShadcnVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>, ButtonVariants {
  children: ReactNode;
  asChild?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  haptic?: boolean;
}

/**
 * Maps our custom variant names to shadcn variant names.
 * 'primary' → 'default' (shadcn's primary-coloured button)
 * All others match 1-to-1.
 */
function mapVariant(variant: ButtonVariants['variant']): ShadcnVariant {
  if (variant === 'primary' || variant === undefined || variant === null) return 'default';
  return variant as ShadcnVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      disabled = false,
      loading = false,
      leftIcon,
      rightIcon,
      haptic = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const { haptic: platformHaptic } = usePlatform();
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && !isDisabled) {
        platformHaptic.impact('light');
      }
      onClick?.(e);
    };

    // Combine our custom variant classes with shadcn base for consistent styling
    const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

    if (asChild) {
      // For asChild, just render a plain div wrapper — no motion needed
      return (
        <ShadcnButton
          ref={ref}
          asChild
          variant={mapVariant(variant)}
          className={classes}
          {...(props as React.ComponentProps<typeof ShadcnButton>)}
        >
          {children}
        </ShadcnButton>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={classes}
        disabled={isDisabled}
        onClick={handleClick}
        whileHover={!isDisabled ? buttonHover : undefined}
        whileTap={!isDisabled ? buttonTap : undefined}
        transition={springTransition}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
