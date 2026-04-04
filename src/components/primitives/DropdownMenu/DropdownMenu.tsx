import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { dropdown, dropdownTransition } from '../../motion/transitions';

export {
  Root as DropdownMenu,
  Trigger as DropdownMenuTrigger,
  Group as DropdownMenuGroup,
  Portal as DropdownMenuPortal,
  Sub as DropdownMenuSub,
  RadioGroup as DropdownMenuRadioGroup,
} from '@radix-ui/react-dropdown-menu';

// Icons
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" fill="currentColor" />
  </svg>
);

// SubTrigger
export interface DropdownMenuSubTriggerProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export const DropdownMenuSubTrigger = forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'rounded-linear flex cursor-pointer items-center gap-2 px-2 py-2 select-none',
        'text-foreground text-sm outline-none',
        'focus:bg-muted focus:text-foreground',
        'data-[state=open]:bg-muted',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon />
    </DropdownMenuPrimitive.SubTrigger>
  ),
);

DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

// SubContent
export type DropdownMenuSubContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
>;

export const DropdownMenuSubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden',
        'rounded-linear-lg border-border bg-popover backdrop-blur-linear border',
        'text-popover-foreground shadow-linear-lg p-1',
        className,
      )}
      asChild
      {...props}
    >
      <motion.div
        variants={dropdown}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={dropdownTransition}
      />
    </DropdownMenuPrimitive.SubContent>
  ),
);

DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

// Content
export type DropdownMenuContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
>;

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, sideOffset = 4, ...props }, ref) => {
    const { haptic } = usePlatform();

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden',
            'rounded-linear-lg border-border bg-popover backdrop-blur-linear border',
            'text-popover-foreground shadow-linear-lg p-1',
            className,
          )}
          onCloseAutoFocus={() => haptic.impact('light')}
          asChild
          {...props}
        >
          <motion.div
            variants={dropdown}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={dropdownTransition}
          />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    );
  },
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

// Item
export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  inset?: boolean;
  destructive?: boolean;
}

export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, destructive, ...props }, ref) => {
    const { haptic } = usePlatform();

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
          'rounded-linear relative flex cursor-pointer items-center gap-2 px-2 py-2 select-none',
          'text-sm transition-colors duration-150 outline-none',
          destructive
            ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
            : 'text-foreground focus:bg-muted focus:text-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          inset && 'pl-8',
          className,
        )}
        onClick={() => haptic.impact('light')}
        {...props}
      />
    );
  },
);

DropdownMenuItem.displayName = 'DropdownMenuItem';

// CheckboxItem
export type DropdownMenuCheckboxItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.CheckboxItem
>;

export const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        'rounded-linear relative flex cursor-pointer items-center py-2 pr-2 pl-8 select-none',
        'text-foreground text-sm transition-colors duration-150 outline-none',
        'focus:bg-muted focus:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  ),
);

DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// RadioItem
export type DropdownMenuRadioItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.RadioItem
>;

export const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        'rounded-linear relative flex cursor-pointer items-center py-2 pr-2 pl-8 select-none',
        'text-foreground text-sm transition-colors duration-150 outline-none',
        'focus:bg-muted focus:text-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <DotIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  ),
);

DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

// Label
export interface DropdownMenuLabelProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> {
  inset?: boolean;
}

export const DropdownMenuLabel = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        'text-muted-foreground px-2 py-1.5 text-xs font-medium',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  ),
);

DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// Separator
export type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
>;

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  ),
);

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

// Shortcut
export type DropdownMenuShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

export const DropdownMenuShortcut = ({ className, ...props }: DropdownMenuShortcutProps) => (
  <span
    className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
    {...props}
  />
);

DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
