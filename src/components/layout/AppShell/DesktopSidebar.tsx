import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

import { useAuthStore } from '@/store/auth';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
} from '@/api/branding';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
// Icons
import {
  HomeIcon,
  SubscriptionIcon,
  WalletIcon,
  UsersIcon,
  ChatIcon,
  UserIcon,
  LogoutIcon,
  GamepadIcon,
  ClipboardIcon,
  InfoIcon,
  CogIcon,
  WheelIcon,
} from './icons';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

interface DesktopSidebarProps {
  isAdmin?: boolean;
  wheelEnabled?: boolean;
  referralEnabled?: boolean;
  hasContests?: boolean;
  hasPolls?: boolean;
}

export function DesktopSidebar({
  isAdmin,
  wheelEnabled,
  referralEnabled,
  hasContests,
  hasPolls,
}: DesktopSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { haptic } = usePlatform();

  // Branding
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      await preloadLogo(data);
      return data;
    },
    initialData: getCachedBranding() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 60000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const appName = branding ? branding.name : FALLBACK_NAME;
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO;
  const hasCustomLogo = branding?.has_custom_logo || false;
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const isAdminActive = () => location.pathname.startsWith('/admin');

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: HomeIcon },
    { path: '/subscriptions', label: t('nav.subscription'), icon: SubscriptionIcon },
    { path: '/balance', label: t('nav.balance'), icon: WalletIcon },
    ...(referralEnabled ? [{ path: '/referral', label: t('nav.referral'), icon: UsersIcon }] : []),
    { path: '/support', label: t('nav.support'), icon: ChatIcon },
    ...(hasContests ? [{ path: '/contests', label: t('nav.contests'), icon: GamepadIcon }] : []),
    ...(hasPolls ? [{ path: '/polls', label: t('nav.polls'), icon: ClipboardIcon }] : []),
    ...(wheelEnabled ? [{ path: '/wheel', label: t('nav.wheel'), icon: WheelIcon }] : []),
    { path: '/info', label: t('nav.info'), icon: InfoIcon },
  ];

  const handleNavClick = () => {
    haptic.impact('light');
  };

  return (
    <aside className="border-border bg-card/50 fixed top-0 left-0 z-40 flex h-screen w-60 flex-col border-r">
      {/* Logo */}
      <div className="border-border flex h-16 items-center gap-3 border-b px-4">
        <Link to="/" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="rounded-linear-lg border-border bg-card relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border">
            <span
              className={cn(
                'text-primary absolute text-lg font-bold transition-opacity duration-200',
                hasCustomLogo && isLogoPreloaded() ? 'opacity-0' : 'opacity-100',
              )}
            >
              {logoLetter}
            </span>
            {hasCustomLogo && logoUrl && (
              <img
                src={logoUrl}
                alt={appName || 'Logo'}
                className={cn(
                  'absolute h-full w-full object-contain transition-opacity duration-200',
                  isLogoPreloaded() ? 'opacity-100' : 'opacity-0',
                )}
              />
            )}
          </div>
          {appName && (
            <span className="text-foreground text-base font-semibold whitespace-nowrap">
              {appName}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={cn(
              'group rounded-linear flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive(item.path)
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
            {isActive(item.path) && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="bg-primary absolute left-0 h-8 w-0.5 rounded-r-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="bg-border my-3 h-px" />
            <Link
              to="/admin"
              onClick={handleNavClick}
              className={cn(
                'group rounded-linear flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isAdminActive()
                  ? 'bg-warning-500/10 text-warning-400'
                  : 'text-warning-500/70 hover:bg-warning-500/10 hover:text-warning-400',
              )}
            >
              <CogIcon className="h-5 w-5 shrink-0" />
              <span>{t('admin.nav.title')}</span>
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-border border-t p-3">
        <Link
          to="/profile"
          onClick={handleNavClick}
          className={cn(
            'group rounded-linear flex items-center gap-3 px-3 py-2.5 transition-all duration-200',
            isActive('/profile') ? 'bg-muted' : 'hover:bg-muted/50',
          )}
        >
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
            <UserIcon className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">
              {user?.first_name || user?.username || `#${user?.telegram_id}`}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              @{user?.username || `ID: ${user?.telegram_id}`}
            </p>
          </div>
        </Link>

        <div className="mt-2 flex items-center gap-2">
          <ThemeToggle className="shrink-0" />
          <Button
            variant="ghost"
            onClick={() => {
              haptic.impact('light');
              logout();
            }}
            className="rounded-linear text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-auto flex-1 items-center justify-start gap-3 px-3 py-2.5 text-sm"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span>{t('nav.logout')}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
