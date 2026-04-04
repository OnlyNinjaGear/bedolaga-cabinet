import { Switch } from '@/components/ui/switch';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className,
}: ToggleProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(className)}
    />
  );
}
