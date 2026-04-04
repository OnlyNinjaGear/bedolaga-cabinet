import * as PopoverPrimitive from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { dropdown, dropdownTransition } from '../../motion/transitions';

export {
  Root as Popover,
  Trigger as PopoverTrigger,
  Anchor as PopoverAnchor,
  Close as PopoverClose,
} from '@radix-ui/react-popover';

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

// Content
export interface PopoverContentProps extends ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> {
  showCloseButton?: boolean;
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    { className, children, align = 'center', sideOffset = 4, showCloseButton = false, ...props },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 overflow-hidden',
          'rounded-linear-lg border-border bg-popover backdrop-blur-linear border',
          'text-popover-foreground shadow-linear-lg p-4 outline-none',
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
        >
          {children}
          {showCloseButton && (
            <PopoverPrimitive.Close
              className={cn(
                'rounded-linear absolute top-2 right-2 p-1.5',
                'text-muted-foreground opacity-70 transition-all',
                'hover:bg-muted hover:opacity-100',
                'focus:ring-ring/50 focus:ring-2 focus:outline-none',
              )}
            >
              <CloseIcon />
              <span className="sr-only">Close</span>
            </PopoverPrimitive.Close>
          )}
        </motion.div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  ),
);

PopoverContent.displayName = 'PopoverContent';

// Arrow
export type PopoverArrowProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow>;

export const PopoverArrow = forwardRef<SVGSVGElement, PopoverArrowProps>(
  ({ className, ...props }, ref) => (
    <PopoverPrimitive.Arrow ref={ref} className={cn('fill-card', className)} {...props} />
  ),
);

PopoverArrow.displayName = 'PopoverArrow';
