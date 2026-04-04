import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '../api/branding';
import { Button } from '@/components/ui/button';

type Status = 'countdown' | 'fallback' | 'error';

// App schemes configuration - same as miniapp
const appSchemes = [
  { scheme: 'happ://', icon: 'H', name: 'Happ' },
  { scheme: 'flclash://', icon: 'F', name: 'FlClash' },
  { scheme: 'clash://', icon: 'C', name: 'Clash Meta' },
  { scheme: 'sing-box://', icon: 'S', name: 'sing-box' },
  { scheme: 'v2rayng://', icon: 'V', name: 'v2rayNG' },
  { scheme: 'sub://', icon: 'R', name: 'Shadowrocket' },
  { scheme: 'shadowrocket://', icon: 'R', name: 'Shadowrocket' },
  { scheme: 'hiddify://', icon: 'H', name: 'Hiddify' },
  { scheme: 'streisand://', icon: 'S', name: 'Streisand' },
  { scheme: 'quantumult://', icon: 'Q', name: 'Quantumult X' },
  { scheme: 'surge://', icon: 'S', name: 'Surge' },
  { scheme: 'loon://', icon: 'L', name: 'Loon' },
  { scheme: 'nekobox://', icon: 'N', name: 'NekoBox' },
  { scheme: 'v2box://', icon: 'V', name: 'V2Box' },
];

const COUNTDOWN_SECONDS = 5;

// Validate deep link to prevent javascript: and other dangerous schemes
const isValidDeepLink = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase().trim();
  // Block dangerous schemes
  // eslint-disable-next-line no-script-url -- listing dangerous schemes to block them
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousSchemes.some((scheme) => lowerUrl.startsWith(scheme))) {
    return false;
  }
  // Only allow known app schemes
  return appSchemes.some((app) => lowerUrl.startsWith(app.scheme));
};

export default function DeepLinkRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [copied, setCopied] = useState(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get branding
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  const projectName = branding ? branding.name : import.meta.env.VITE_APP_NAME || 'VPN';
  const logoLetter = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V';
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Parse raw query string to preserve '+' chars in base64 crypto links.
  // URLSearchParams decodes '+' as space, breaking ss://, vless:// etc.
  // decodeURIComponent does NOT treat '+' as space, so parsing raw pairs is correct.
  const getRawParam = (key: string): string => {
    const search = window.location.search.substring(1);
    for (const pair of search.split('&')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      if (decodeURIComponent(pair.substring(0, idx)) === key) {
        return decodeURIComponent(pair.substring(idx + 1));
      }
    }
    return '';
  };

  // Get parameters
  const deepLink = getRawParam('url') || getRawParam('deeplink') || '';
  const subscriptionUrl = getRawParam('sub') || '';
  const appParam = searchParams.get('app') || '';

  // Detect app from deep link
  const appInfo = deepLink
    ? appSchemes.find((a) => deepLink.toLowerCase().startsWith(a.scheme))
    : null;
  const appName = appInfo?.name || appParam || 'VPN';
  const appIcon = appInfo?.icon || appName[0]?.toUpperCase() || 'V';

  // Open deep link - same as miniapp, just window.location.href
  const openDeepLink = useCallback(() => {
    if (!deepLink || !isValidDeepLink(deepLink)) return;
    window.location.href = deepLink;
  }, [deepLink]);

  // Countdown timer effect
  useEffect(() => {
    if (!deepLink || !isValidDeepLink(deepLink)) {
      setStatus('error');
      return;
    }

    if (status !== 'countdown') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          openDeepLink();
          // Show fallback after a delay - store ref for cleanup
          fallbackTimeoutRef.current = setTimeout(() => setStatus('fallback'), 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      // Cleanup fallback timeout on unmount
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [deepLink, status, openDeepLink]);

  const handleCopyLink = async () => {
    const linkToCopy = subscriptionUrl || deepLink;
    // Clear previous timeout to prevent stacking
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = linkToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  // Cleanup copied timeout on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // Progress percentage
  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background */}
      <div className="from-background via-background to-background fixed inset-0 bg-gradient-to-br" />
      <div className="from-primary/10 fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent" />

      <div className="relative w-full max-w-sm text-center">
        {/* Logo with pulse animation */}
        <div className="from-primary/80 to-primary/80 shadow-primary/30 mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg">
          {branding?.has_custom_logo && logoUrl ? (
            <img src={logoUrl} alt={projectName || 'Logo'} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-white">{logoLetter}</span>
          )}
        </div>

        <h1 className="text-foreground mb-1 text-2xl font-bold">{projectName || 'VPN'}</h1>

        {status !== 'error' && (
          <p className="text-muted-foreground mb-6">
            {t('deepLink.connecting')} {appName}...
          </p>
        )}

        {/* Countdown State */}
        {status === 'countdown' && (
          <div className="card !bg-card/80 p-6 backdrop-blur-sm">
            {/* App icon */}
            <div className="bg-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <span className="text-primary text-2xl font-bold">{appIcon}</span>
            </div>

            {/* Spinner */}
            <div className="border-border border-t-accent-500 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-3" />

            {/* Timer */}
            <div className="mb-4">
              <p className="text-muted-foreground mb-2 text-sm">{t('deepLink.redirecting')}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-primary text-4xl font-bold">{countdown}</span>
                <span className="text-muted-foreground">{t('deepLink.seconds')}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-muted mb-4 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="from-primary/80 to-primary/80 h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-muted-foreground mb-4 text-sm">{t('deepLink.manual')}</p>

            {/* Open now button */}
            <Button
              onClick={openDeepLink}
              className="flex w-full items-center justify-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              {t('deepLink.openApp')}
            </Button>
          </div>
        )}

        {/* Fallback State - App didn't open */}
        {status === 'fallback' && (
          <div className="card !bg-card/80 p-6 backdrop-blur-sm">
            {/* App icon */}
            <div className="bg-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <span className="text-primary text-2xl font-bold">{appIcon}</span>
            </div>

            <div className="space-y-3">
              {/* Copy subscription link */}
              <Button
                onClick={handleCopyLink}
                className="flex w-full items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {t('deepLink.copied')}
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {t('deepLink.copyLink')}
                  </>
                )}
              </Button>

              {/* Try again button */}
              <Button
                variant="secondary"
                onClick={openDeepLink}
                className="flex w-full items-center justify-center gap-2"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
                {t('deepLink.tryAgain')}
              </Button>

              {/* Back to cabinet */}
              <Button variant="ghost" onClick={() => navigate('/subscriptions')} className="w-full">
                {t('deepLink.backToCabinet')}
              </Button>
            </div>

            {/* Instructions */}
            <div className="border-border bg-background/50 mt-6 rounded-xl border p-4 text-left">
              <h3 className="text-foreground mb-2 text-sm font-medium">{t('deepLink.howToAdd')}</h3>
              <ol className="text-muted-foreground list-inside list-decimal space-y-1.5 text-xs">
                <li>{t('deepLink.step1')}</li>
                <li>
                  {t('deepLink.step2')} {appName}
                </li>
                <li>{t('deepLink.step3')}</li>
                <li>{t('deepLink.step4')}</li>
              </ol>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="card !bg-card/80 p-6 backdrop-blur-sm">
            <div className="bg-error-500/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-error-400 h-8 w-8"
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
            <p className="text-foreground mb-2 font-medium">{t('deepLink.errorTitle')}</p>
            <p className="text-muted-foreground mb-6 text-sm">{t('deepLink.errorDesc')}</p>
            <Button onClick={() => navigate('/subscriptions')} className="w-full">
              {t('deepLink.goToSubscription')}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
          <span className="text-xs">VPN Config Redirect</span>
        </div>
      </div>
    </div>
  );
}
