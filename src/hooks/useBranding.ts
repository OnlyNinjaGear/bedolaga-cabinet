import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useTelegramSDK, setCachedFullscreenEnabled } from '@/hooks/useTelegramSDK';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
  type SeoConfig,
} from '@/api/branding';

// Apply SEO/OG meta tags to document head
function applySeoToHead(config: SeoConfig) {
  const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.content = content;
  };
  if (config.site_title) document.title = config.site_title;
  if (config.site_description) setMeta('description', config.site_description);
  if (config.robots) setMeta('robots', config.robots);
  if (config.og_title) setMeta('og:title', config.og_title, 'property');
  if (config.og_description) setMeta('og:description', config.og_description, 'property');
  if (config.og_image_url) setMeta('og:image', config.og_image_url, 'property');
  if (config.og_site_name) setMeta('og:site_name', config.og_site_name, 'property');
  setMeta('og:type', 'website', 'property');
  setMeta('twitter:card', config.twitter_card);
  if (config.og_title) setMeta('twitter:title', config.og_title);
  if (config.og_description) setMeta('twitter:description', config.og_description);
  if (config.canonical_url) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = config.canonical_url;
  }
}

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

export function useBranding() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isTelegramWebApp, requestFullscreen, isMobile } = useTelegramSDK();

  // Branding data
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
    enabled: isAuthenticated,
  });

  const appName = branding ? branding.name : FALLBACK_NAME;
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO;
  const hasCustomLogo = branding?.has_custom_logo || false;
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN';
  }, [appName]);

  // Update favicon
  useEffect(() => {
    if (!logoUrl) return;

    const link =
      document.querySelector<HTMLLinkElement>("link[rel*='icon']") ||
      document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = logoUrl;
    document.head.appendChild(link);
  }, [logoUrl]);

  // SEO config - load and apply to document head
  const { data: seoConfig } = useQuery({
    queryKey: ['seo-config'],
    queryFn: brandingApi.getSeoConfig,
    staleTime: 300000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (seoConfig) applySeoToHead(seoConfig);
  }, [seoConfig]);

  // Fullscreen setting from server
  const { data: fullscreenSetting } = useQuery({
    queryKey: ['fullscreen-enabled'],
    queryFn: brandingApi.getFullscreenEnabled,
    staleTime: 60000,
  });

  const fullscreenRequestedRef = useRef(false);

  useEffect(() => {
    if (!fullscreenSetting || !isTelegramWebApp) return;
    setCachedFullscreenEnabled(fullscreenSetting.enabled);
    if (fullscreenSetting.enabled && isMobile && !fullscreenRequestedRef.current) {
      fullscreenRequestedRef.current = true;
      requestFullscreen();
    }
  }, [fullscreenSetting, isTelegramWebApp, requestFullscreen, isMobile]);

  return {
    appName,
    logoLetter,
    hasCustomLogo,
    logoUrl,
    isLogoPreloaded,
  };
}
