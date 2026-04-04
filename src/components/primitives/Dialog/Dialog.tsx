import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  createContext,
  useContext,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { backdrop, backdropTransition, scale, scaleTransition } from '../../motion/transitions';

export {
  Trigger as DialogTrigger,
  Portal as DialogPortal,
  Close as DialogClose,
} from '@radix-ui/react-dialog';

// Close icon
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M12 4L4 12M4 4l8 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Context for AnimatePresence
const DialogContext = createContext<{ open: boolean }>({ open: false });

// Root
export type DialogProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

export const Dialog = ({ children, open, onOpenChange, ...props }: DialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = onOpenChange || setInternalOpen;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange} {...props}>
      <DialogContext.Provider value={{ open: isOpen }}>{children}</DialogContext.Provider>
    </DialogPrimitive.Root>
  );
};

// Overlay
export type DialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-black/80 backdrop-blur-sm', className)}
      asChild
      {...props}
    >
      <motion.div
        variants={backdrop}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={backdropTransition}
      />
    </DialogPrimitive.Overlay>
  ),
);

DialogOverlay.displayName = 'DialogOverlay';

// Content
export interface DialogContentProps extends ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  showCloseButton?: boolean;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { open } = useContext(DialogContext);

    return (
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence mode="wait">
          {open && (
            <>
              <DialogOverlay />
              <DialogPrimitive.Content
                ref={ref}
                className={cn(
                  'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                  'max-h-[85vh] w-full max-w-lg',
                  'grid gap-4 overflow-auto',
                  'rounded-linear-lg border-border bg-card backdrop-blur-linear border',
                  'shadow-linear-lg p-6',
                  'focus:outline-none',
                  className,
                )}
                asChild
                {...props}
              >
                <motion.div
                  variants={scale}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={scaleTransition}
                >
                  {children}
                  {showCloseButton && (
                    <DialogPrimitive.Close
                      className={cn(
                        'rounded-linear absolute top-4 right-4 p-1.5',
                        'text-muted-foreground opacity-70 transition-all',
                        'hover:bg-muted hover:opacity-100',
                        'focus:ring-ring/50 focus:ring-2 focus:outline-none',
                      )}
                    >
                      <CloseIcon />
                      <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                  )}
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    );
  },
);

DialogContent.displayName = 'DialogContent';

// Header
export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

DialogHeader.displayName = 'DialogHeader';

// Footer
export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);

DialogFooter.displayName = 'DialogFooter';

// Title
export type DialogTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-foreground text-lg font-semibold', className)}
      {...props}
    />
  ),
);

DialogTitle.displayName = 'DialogTitle';

// Description
export type DialogDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  ),
);

DialogDescription.displayName = 'DialogDescription';
