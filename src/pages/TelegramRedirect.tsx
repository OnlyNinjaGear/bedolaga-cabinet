import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { useShallow } from 'zustand/shallow';
import { brandingApi } from '../api/branding';
import { isInTelegramWebApp, getTelegramInitData } from '../hooks/useTelegramSDK';
import { tokenStorage } from '../utils/token';
import { Button } from '@/components/ui/button';

// Validate redirect URL to prevent open redirect attacks
const getSafeRedirectUrl = (url: string | null): string => {
  if (!url) return '/';
  // Only allow relative paths starting with /
  // Block protocol-relative URLs (//evil.com) and absolute URLs
  if (!url.startsWith('/') || url.startsWith('//')) {
    return '/';
  }
  // Additional check for encoded characters that could bypass validation
  try {
    const decoded = decodeURIComponent(url);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('://')) {
      return '/';
    }
  } catch {
    return '/';
  }
  return url;
};

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COUNT_KEY = 'telegram_redirect_retry_count';

export default function TelegramRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    loginWithTelegram,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuthStore(
    useShallow((state) => ({
      loginWithTelegram: state.loginWithTelegram,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
    })),
  );
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not-telegram'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(() => {
    const stored = sessionStorage.getItem(RETRY_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  // Get branding for nice display
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  const appName = branding ? branding.name : import.meta.env.VITE_APP_NAME || 'VPN';
  const logoLetter = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V';
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Get redirect target from URL params (validated)
  const redirectTo = getSafeRedirectUrl(searchParams.get('redirect'));

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (isAuthenticated && !authLoading) {
      setStatus('success');
      setTimeout(() => navigate(redirectTo), 500);
      return;
    }

    const initTelegram = async () => {
      // Check if running in Telegram WebApp
      const initData = getTelegramInitData();

      if (!isInTelegramWebApp() || !initData) {
        // Not in Telegram, show message and redirect to login
        setStatus('not-telegram');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      // Note: ready(), expand(), and theme CSS vars are already handled by SDK init in main.tsx

      try {
        await loginWithTelegram(initData);
        setStatus('success');

        // Small delay for nice UX
        setTimeout(() => {
          navigate(redirectTo);
        }, 800);
      } catch (err: unknown) {
        console.error('Telegram auth failed:', err);
        const error = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(error.response?.data?.detail || t('auth.telegramRequired'));
        setStatus('error');
      }
    };

    // Small delay to show loading screen
    setTimeout(initTelegram, 300);
  }, [loginWithTelegram, navigate, isAuthenticated, authLoading, redirectTo, t]);

  // Handle retry with limit to prevent infinite loops
  const handleRetry = () => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setErrorMessage(t('telegramRedirect.maxRetries'));
      sessionStorage.removeItem(RETRY_COUNT_KEY);
      return;
    }
    const newCount = retryCount + 1;
    setRetryCount(newCount);
    sessionStorage.setItem(RETRY_COUNT_KEY, String(newCount));

    // Clear all cached auth state to prevent stale token/initData loops
    tokenStorage.clearTokens();
    sessionStorage.removeItem('tapps/launchParams');
    sessionStorage.removeItem('telegram_init_data');
    localStorage.removeItem('cabinet-auth');
    localStorage.removeItem('tg_user_id');

    setStatus('loading');
    setErrorMessage('');
    window.location.reload();
  };

  // Clear retry count on successful auth
  useEffect(() => {
    if (status === 'success') {
      sessionStorage.removeItem(RETRY_COUNT_KEY);
    }
  }, [status]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background */}
      <div className="from-background via-background to-background fixed inset-0 bg-gradient-to-br" />
      <div className="from-primary/10 fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent" />

      <div className="relative w-full max-w-sm text-center">
        {/* Logo */}
        <div className="from-primary/80 to-primary/80 shadow-primary/30 mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg">
          {branding?.has_custom_logo && logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-white">{logoLetter}</span>
          )}
        </div>

        <h1 className="text-foreground mb-2 text-2xl font-bold">{appName}</h1>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="mt-8">
            <div className="border-primary mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-3 border-t-transparent" />
            <p className="text-muted-foreground">{t('auth.authenticating')}</p>
            <p className="text-muted-foreground mt-2 text-sm">{t('common.loading')}</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="mt-8">
            <div className="bg-success-500/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-success-400 h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-foreground">{t('auth.loginSuccess')}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('telegramRedirect.redirecting')}
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="mt-8">
            <div className="bg-error-500/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-error-400 h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-foreground mb-2">{t('auth.loginFailed')}</p>
            <p className="text-error-400 mb-6 text-sm">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRetry} className="w-full">
                {t('auth.tryAgain')}
              </Button>
              <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                {t('telegramRedirect.loginAlternative')}
              </Button>
            </div>
          </div>
        )}

        {/* Not in Telegram State */}
        {status === 'not-telegram' && (
          <div className="mt-8">
            <div className="bg-warning-500/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-warning-400 h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="text-foreground mb-2">{t('telegramRedirect.openInTelegram')}</p>
            <p className="text-muted-foreground mb-6 text-sm">
              {t('telegramRedirect.openInTelegramDesc')}
            </p>
            <p className="text-muted-foreground text-sm">{t('telegramRedirect.redirectToLogin')}</p>
          </div>
        )}

        {/* Telegram branding */}
        <div className="text-muted-foreground mt-12 flex items-center justify-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          <span className="text-xs">Telegram Mini App</span>
        </div>
      </div>
    </div>
  );
}
