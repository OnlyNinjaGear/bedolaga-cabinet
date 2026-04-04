import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { buttonTap, buttonHover, springTransition } from '@/components/motion/transitions';

// Re-export shadcn card sub-components so consumers can import from here
export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';

const cardVariants = cva(
  [
    'relative overflow-hidden',
    'border border-border bg-card',
    'rounded-xl',
    'transition-[border-color,background-color,box-shadow,transform,opacity] duration-200',
  ],
  {
    variants: {
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5 sm:p-6',
        xl: 'p-6 sm:p-8',
      },
      variant: {
        default: '',
        glass: 'backdrop-blur-xl bg-card/50',
        solid: 'bg-card',
        outline: 'bg-transparent',
      },
      interactive: {
        true: ['cursor-pointer', 'hover:border-border hover:bg-muted', 'active:scale-[0.98]'],
        false: '',
      },
      glow: {
        true: 'hover:border-primary/30 hover:shadow-glow',
        false: '',
      },
    },
    defaultVariants: {
      size: 'lg',
      variant: 'default',
      interactive: false,
      glow: false,
    },
  },
);

export interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'children'>, VariantProps<typeof cardVariants> {
  children: ReactNode;
  asChild?: boolean;
  haptic?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      size,
      variant,
      interactive,
      glow,
      asChild = false,
      haptic: enableHaptic = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const { haptic } = usePlatform();

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactive && enableHaptic) {
        haptic.impact('light');
      }
      onClick?.(e);
    };

    const classes = cn(cardVariants({ size, variant, interactive, glow }), className);

    if (asChild) {
      return (
        <Slot ref={ref} className={classes}>
          {children}
        </Slot>
      );
    }

    if (interactive) {
      return (
        <motion.div
          ref={ref}
          className={classes}
          onClick={handleClick}
          whileHover={buttonHover}
          whileTap={buttonTap}
          transition={springTransition}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div ref={ref} className={classes} {...props}>
        {children}
      </motion.div>
    );
  },
);

Card.displayName = 'Card';
