import { Command as CommandPrimitive } from 'cmdk';
import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Search icon
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
    <path
      d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Root Command
export type CommandProps = ComponentPropsWithoutRef<typeof CommandPrimitive>;

export const Command = forwardRef<HTMLDivElement, CommandProps>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'rounded-linear-lg flex h-full w-full flex-col overflow-hidden',
      'bg-popover text-popover-foreground backdrop-blur-linear',
      className,
    )}
    {...props}
  />
));

Command.displayName = 'Command';

// Input
export type CommandInputProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Input>;

export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <div className="border-input flex items-center border-b px-3" cmdk-input-wrapper="">
      <SearchIcon />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          'text-foreground flex h-12 w-full bg-transparent py-3 pl-2 text-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  ),
);

CommandInput.displayName = 'CommandInput';

// List (scrollable area)
export type CommandListProps = ComponentPropsWithoutRef<typeof CommandPrimitive.List>;

export const CommandList = forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.List
      ref={ref}
      className={cn(
        'max-h-75 overflow-x-hidden overflow-y-auto',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted',
        className,
      )}
      {...props}
    />
  ),
);

CommandList.displayName = 'CommandList';

// Empty state
export type CommandEmptyProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>;

export const CommandEmpty = forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Empty
      ref={ref}
      className={cn('text-muted-foreground py-6 text-center text-sm', className)}
      {...props}
    />
  ),
);

CommandEmpty.displayName = 'CommandEmpty';

// Group
export type CommandGroupProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Group>;

export const CommandGroup = forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        'text-foreground overflow-hidden p-1',
        '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5',
        '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        className,
      )}
      {...props}
    />
  ),
);

CommandGroup.displayName = 'CommandGroup';

// Separator
export type CommandSeparatorProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>;

export const CommandSeparator = forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Separator
      ref={ref}
      className={cn('bg-border -mx-1 h-px', className)}
      {...props}
    />
  ),
);

CommandSeparator.displayName = 'CommandSeparator';

// Item
export type CommandItemProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Item>;

export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        'rounded-linear relative flex cursor-pointer items-center gap-2 px-2 py-2 select-none',
        'text-foreground text-sm outline-none',
        'aria-selected:bg-muted aria-selected:text-foreground',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        'transition-colors duration-150',
        className,
      )}
      {...props}
    />
  ),
);

CommandItem.displayName = 'CommandItem';

// Shortcut display
export type CommandShortcutProps = HTMLAttributes<HTMLSpanElement>;

export const CommandShortcut = ({ className, ...props }: CommandShortcutProps) => (
  <span
    className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
    {...props}
  />
);

CommandShortcut.displayName = 'CommandShortcut';

// Loading state
export type CommandLoadingProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Loading>;

export const CommandLoading = forwardRef<HTMLDivElement, CommandLoadingProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Loading
      ref={ref}
      className={cn('text-muted-foreground py-6 text-center text-sm', className)}
      {...props}
    />
  ),
);

CommandLoading.displayName = 'CommandLoading';
