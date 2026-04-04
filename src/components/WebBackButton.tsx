import { Link } from 'react-router';
import { usePlatform } from '../platform';
import { BackIcon } from './icons';

interface WebBackButtonProps {
  to: string;
  replace?: boolean;
  className?: string;
}

/**
 * Back button visible only on web platform.
 * Hidden in Telegram Mini App — native back button handles navigation there.
 */
export function WebBackButton({ to, replace, className }: WebBackButtonProps) {
  const { platform } = usePlatform();

  if (platform === 'telegram') return null;

  return (
    <Link
      to={to}
      replace={replace}
      className={
        className ||
        'border-border bg-card hover:border-border flex h-10 w-10 items-center justify-center rounded-xl border transition-colors'
      }
    >
      <BackIcon />
    </Link>
  );
}
