import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { usePlatform } from '@/platform';
import { cn } from '@/lib/utils';
import { SunIcon, MoonIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { toggleTheme, isDark, canToggle } = useTheme();
  const { haptic } = usePlatform();

  if (!canToggle) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        haptic.impact('light');
        toggleTheme();
      }}
      className={cn(
        'rounded-linear-lg border-border bg-card/50 text-muted-foreground hover:bg-muted hover:text-primary relative border transition-all duration-200',
        className,
      )}
      title={isDark ? t('theme.light') || 'Light mode' : t('theme.dark') || 'Dark mode'}
    >
      <div className="relative h-5 w-5">
        <div
          className={cn(
            'absolute inset-0 transition-all duration-300',
            isDark ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0',
          )}
        >
          <MoonIcon className="h-5 w-5" />
        </div>
        <div
          className={cn(
            'absolute inset-0 transition-all duration-300',
            isDark ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100',
          )}
        >
          <SunIcon className="h-5 w-5" />
        </div>
      </div>
    </Button>
  );
}
