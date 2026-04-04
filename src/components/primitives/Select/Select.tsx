import * as SelectPrimitive from '@radix-ui/react-select';
import { motion } from 'framer-motion';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { dropdown, dropdownTransition } from '../../motion/transitions';

export { Root as Select, Group as SelectGroup } from '@radix-ui/react-select';

// Icons
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Trigger
export interface SelectTriggerProps extends ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> {
  placeholder?: string;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { haptic } = usePlatform();

    return (
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          'rounded-linear flex h-10 w-full items-center justify-between gap-2 px-3',
          'border-input bg-background border',
          'text-foreground placeholder:text-muted-foreground text-sm',
          'hover:border-border hover:bg-muted',
          'focus:ring-ring/50 focus:ring-offset-background focus:ring-2 focus:ring-offset-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          '[&>span]:line-clamp-1',
          className,
        )}
        onClick={() => haptic.impact('light')}
        {...props}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDownIcon />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  },
);

SelectTrigger.displayName = 'SelectTrigger';

// Content
export type SelectContentProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Content>;

export const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 max-h-80 min-w-[8rem] overflow-hidden',
          'rounded-linear-lg border-border bg-popover backdrop-blur-linear border',
          'text-popover-foreground shadow-linear-lg',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        asChild
        {...props}
      >
        <motion.div
          variants={dropdown}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={dropdownTransition}
        >
          <SelectPrimitive.Viewport
            className={cn(
              'p-1',
              position === 'popper' &&
                'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
        </motion.div>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);

SelectContent.displayName = 'SelectContent';

// Item
export interface SelectItemProps extends ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  children: ReactNode;
}

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'rounded-linear relative flex w-full cursor-pointer items-center py-2 pr-8 pl-3 select-none',
        'text-foreground text-sm outline-none',
        'hover:bg-muted hover:text-foreground',
        'focus:bg-muted focus:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[state=checked]:text-primary',
        'transition-colors duration-150',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  ),
);

SelectItem.displayName = 'SelectItem';

// Label
export type SelectLabelProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Label>;

export const SelectLabel = forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('text-muted-foreground px-3 py-1.5 text-xs font-medium', className)}
      {...props}
    />
  ),
);

SelectLabel.displayName = 'SelectLabel';

// Separator
export type SelectSeparatorProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>;

export const SelectSeparator = forwardRef<HTMLDivElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  ),
);

SelectSeparator.displayName = 'SelectSeparator';
