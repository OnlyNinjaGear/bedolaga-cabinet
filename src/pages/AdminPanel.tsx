import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePermissionStore } from '@/store/permissions';
import { statsApi, type SystemInfo, type DashboardStats } from '@/api/admin';
import { rbacApi, type AuditLogEntry } from '@/api/rbac';
import { brandingApi } from '@/api/branding';
import { tariffsApi } from '@/api/tariffs';
import { adminPaymentMethodsApi } from '@/api/adminPaymentMethods';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const CABINET_VERSION = __APP_VERSION__;
const IS_MAC = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);

// ─── Inline SVG Icons (lightweight, no external deps) ───

const SvgIcon = ({
  children,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

// Stats bar icons (16x16 viewBox)
const StatUptimeIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 4.5V8l2.5 1.5" />
  </svg>
);
const StatBotIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="10" height="8" rx="2" />
    <path d="M6 8h.01M10 8h.01" />
    <path d="M8 2v2M4 14h8" />
  </svg>
);
const StatCabinetIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M2 6h12" />
    <path d="M5 3v3" />
  </svg>
);
const StatTrialIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <path d="M8 2v2M8 12v2M4 8H2M14 8h-2" />
    <circle cx="8" cy="8" r="3" />
  </svg>
);
const StatPaidIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <path d="M4 6c0-1.7 1.8-3 4-3s4 1.3 4 3-1.8 3-4 3-4 1.3-4 3 1.8 3 4 3 4-1.3 4-3" />
    <path d="M8 1v2M8 13v2" />
  </svg>
);

// Section nav icons (24x24 viewBox)
const icons = {
  'bar-chart': (
    <SvgIcon>
      <path d="M3 3v18h18" />
      <path d="M7 16V8" />
      <path d="M11 16V11" />
      <path d="M15 16V5" />
      <path d="M19 16v-3" />
    </SvgIcon>
  ),
  'credit-card': (
    <SvgIcon>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </SvgIcon>
  ),
  activity: (
    <SvgIcon>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </SvgIcon>
  ),
  trending: (
    <SvgIcon>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </SvgIcon>
  ),
  users: (
    <SvgIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </SvgIcon>
  ),
  ticket: (
    <SvgIcon>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </SvgIcon>
  ),
  'shield-alert': (
    <SvgIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </SvgIcon>
  ),
  tag: (
    <SvgIcon>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </SvgIcon>
  ),
  gift: (
    <SvgIcon>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    </SvgIcon>
  ),
  percent: (
    <SvgIcon>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </SvgIcon>
  ),
  sparkle: (
    <SvgIcon>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
    </SvgIcon>
  ),
  wallet: (
    <SvgIcon>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </SvgIcon>
  ),
  layout: (
    <SvgIcon>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </SvgIcon>
  ),
  newspaper: (
    <SvgIcon>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </SvgIcon>
  ),
  megaphone: (
    <SvgIcon>
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </SvgIcon>
  ),
  send: (
    <SvgIcon>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </SvgIcon>
  ),
  pin: (
    <SvgIcon>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </SvgIcon>
  ),
  'circle-dot': (
    <SvgIcon>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </SvgIcon>
  ),
  handshake: (
    <SvgIcon>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88" />
      <path d="m2 12 5.56-5.56a3 3 0 0 1 2.22-.88L12 5.5" />
      <path d="M22 12 16.44 6.44a3 3 0 0 0-2.22-.88L12 5.5" />
    </SvgIcon>
  ),
  'arrow-up': (
    <SvgIcon>
      <path d="m18 9-6-6-6 6" />
      <path d="M12 3v14" />
      <path d="M5 21h14" />
    </SvgIcon>
  ),
  network: (
    <SvgIcon>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </SvgIcon>
  ),
  radio: (
    <SvgIcon>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </SvgIcon>
  ),
  settings: (
    <SvgIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </SvgIcon>
  ),
  app: (
    <SvgIcon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 4v4M2 8h20M6 4v4" />
    </SvgIcon>
  ),
  server: (
    <SvgIcon>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
    </SvgIcon>
  ),
  remnawave: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-3.25"
      aria-hidden="true"
    >
      <path
        clipRule="evenodd"
        d="M8 1a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-1.5 0V1.75A.75.75 0 0 1 8 1Zm6 2a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0v-8.5A.75.75 0 0 1 14 3ZM5 4a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 5 4Zm6 1a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 11 5ZM2 6a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 2 6Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  ),
  mail: (
    <SvgIcon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </SvgIcon>
  ),
  refresh: (
    <SvgIcon>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </SvgIcon>
  ),
  shield: (
    <SvgIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </SvgIcon>
  ),
  'user-check': (
    <SvgIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </SvgIcon>
  ),
  lock: (
    <SvgIcon>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </SvgIcon>
  ),
  scroll: (
    <SvgIcon>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M15 8h-5M15 12h-5" />
    </SvgIcon>
  ),
  heart: (
    <SvgIcon>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </SvgIcon>
  ),
  search: (
    <SvgIcon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </SvgIcon>
  ),
  chevron: (
    <SvgIcon>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  ),
  x: (
    <SvgIcon>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  ),
  bell: (
    <SvgIcon>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </SvgIcon>
  ),
} as const;

type IconName = keyof typeof icons;

// ─── Section Data ───

interface AdminNavItem {
  name: string;
  icon: IconName;
  to: string;
  permission: string;
}

interface AdminSection {
  id: string;
  titleKey: string;
  accent: string;
  gradient: string;
  items: AdminNavItem[];
}

const sections: AdminSection[] = [
  {
    id: 'analytics',
    titleKey: 'admin.groups.analytics',
    accent: 'var(--color-success-400)',
    gradient: 'linear-gradient(135deg, var(--color-success-400), var(--primary))',
    items: [
      {
        name: 'admin.nav.dashboard',
        icon: 'bar-chart',
        to: '/admin/dashboard',
        permission: 'stats:read',
      },
      {
        name: 'admin.nav.payments',
        icon: 'credit-card',
        to: '/admin/payments',
        permission: 'payments:read',
      },
      {
        name: 'admin.nav.trafficUsage',
        icon: 'activity',
        to: '/admin/traffic-usage',
        permission: 'traffic:read',
      },
      {
        name: 'admin.nav.salesStats',
        icon: 'trending',
        to: '/admin/sales-stats',
        permission: 'sales_stats:read',
      },
    ],
  },
  {
    id: 'users',
    titleKey: 'admin.groups.users',
    accent: 'var(--primary)',
    gradient: 'linear-gradient(135deg, var(--primary), var(--color-error-400))',
    items: [
      { name: 'admin.nav.users', icon: 'users', to: '/admin/users', permission: 'users:read' },
      {
        name: 'admin.nav.tickets',
        icon: 'ticket',
        to: '/admin/tickets',
        permission: 'tickets:read',
      },
      {
        name: 'admin.nav.banSystem',
        icon: 'shield-alert',
        to: '/admin/ban-system',
        permission: 'ban_system:read',
      },
    ],
  },
  {
    id: 'tariffs',
    titleKey: 'admin.groups.tariffs',
    accent: 'var(--color-warning-400)',
    gradient: 'linear-gradient(135deg, var(--color-warning-400), var(--color-error-300))',
    items: [
      { name: 'admin.nav.tariffs', icon: 'tag', to: '/admin/tariffs', permission: 'tariffs:read' },
      {
        name: 'admin.nav.promocodes',
        icon: 'gift',
        to: '/admin/promocodes',
        permission: 'promocodes:read',
      },
      {
        name: 'admin.nav.promoGroups',
        icon: 'percent',
        to: '/admin/promo-groups',
        permission: 'promo_groups:read',
      },
      {
        name: 'admin.nav.promoOffers',
        icon: 'sparkle',
        to: '/admin/promo-offers',
        permission: 'promo_offers:read',
      },
      {
        name: 'admin.nav.paymentMethods',
        icon: 'wallet',
        to: '/admin/payment-methods',
        permission: 'payment_methods:read',
      },
      {
        name: 'admin.nav.landings',
        icon: 'layout',
        to: '/admin/landings',
        permission: 'landings:read',
      },
    ],
  },
  {
    id: 'marketing',
    titleKey: 'admin.groups.marketing',
    accent: 'var(--primary)',
    gradient:
      'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, black))',
    items: [
      { name: 'admin.nav.news', icon: 'newspaper', to: '/admin/news', permission: 'news:read' },
      {
        name: 'admin.nav.campaigns',
        icon: 'megaphone',
        to: '/admin/campaigns',
        permission: 'campaigns:read',
      },
      {
        name: 'admin.nav.broadcasts',
        icon: 'send',
        to: '/admin/broadcasts',
        permission: 'broadcasts:read',
      },
      {
        name: 'admin.nav.pinnedMessages',
        icon: 'pin',
        to: '/admin/pinned-messages',
        permission: 'pinned_messages:read',
      },
      { name: 'admin.nav.wheel', icon: 'circle-dot', to: '/admin/wheel', permission: 'wheel:read' },
      {
        name: 'admin.nav.partners',
        icon: 'handshake',
        to: '/admin/partners',
        permission: 'partners:read',
      },
      {
        name: 'admin.nav.withdrawals',
        icon: 'arrow-up',
        to: '/admin/withdrawals',
        permission: 'withdrawals:read',
      },
      {
        name: 'admin.nav.referralNetwork',
        icon: 'network',
        to: '/admin/referral-network',
        permission: 'stats:read',
      },
    ],
  },
  {
    id: 'system',
    titleKey: 'admin.groups.system',
    accent: 'var(--primary)',
    gradient: 'linear-gradient(135deg, var(--primary), var(--color-success-500))',
    items: [
      {
        name: 'admin.nav.channelSubscriptions',
        icon: 'radio',
        to: '/admin/channel-subscriptions',
        permission: 'channels:read',
      },
      {
        name: 'admin.nav.settings',
        icon: 'settings',
        to: '/admin/settings',
        permission: 'settings:read',
      },
      {
        name: 'admin.nav.seo',
        icon: 'search',
        to: '/admin/seo',
        permission: 'settings:read',
      },
      { name: 'admin.nav.apps', icon: 'app', to: '/admin/apps', permission: 'apps:read' },
      {
        name: 'admin.nav.servers',
        icon: 'server',
        to: '/admin/servers',
        permission: 'servers:read',
      },
      {
        name: 'admin.nav.remnawave',
        icon: 'remnawave',
        to: '/admin/remnawave',
        permission: 'remnawave:read',
      },
      {
        name: 'admin.nav.emailTemplates',
        icon: 'mail',
        to: '/admin/email-templates',
        permission: 'email_templates:read',
      },
      {
        name: 'admin.nav.updates',
        icon: 'refresh',
        to: '/admin/updates',
        permission: 'updates:read',
      },
      {
        name: 'admin.nav.health',
        icon: 'heart',
        to: '/admin/health',
        permission: 'settings:read',
      },
      {
        name: 'admin.nav.notifications',
        icon: 'bell',
        to: '/admin/notifications',
        permission: 'settings:read',
      },
    ],
  },
  {
    id: 'security',
    titleKey: 'admin.groups.security',
    accent: 'var(--color-error-400)',
    gradient:
      'linear-gradient(135deg, var(--color-error-400), color-mix(in srgb, var(--primary) 60%, black))',
    items: [
      { name: 'admin.nav.roles', icon: 'shield', to: '/admin/roles', permission: 'roles:read' },
      {
        name: 'admin.nav.roleAssign',
        icon: 'user-check',
        to: '/admin/roles/assign',
        permission: 'roles:assign',
      },
      { name: 'admin.nav.policies', icon: 'lock', to: '/admin/policies', permission: 'roles:read' },
      {
        name: 'admin.nav.auditLog',
        icon: 'scroll',
        to: '/admin/audit-log',
        permission: 'audit_log:read',
      },
    ],
  },
];

// ─── Helpers ───

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Animated Stat Number ───

function AnimatedStat({ value, suffix }: { value: number; suffix?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <span>
      {Math.round(animated).toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Stats Bar ───

interface StatsBarProps {
  systemInfo: SystemInfo | null;
  dashboardStats: DashboardStats | null;
  loading: boolean;
}

const StatsBar = memo(function StatsBar({ systemInfo, dashboardStats, loading }: StatsBarProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const uptime = systemInfo?.uptime_seconds ?? 0;
    const trial = dashboardStats?.subscriptions.trial ?? 0;
    const paid = dashboardStats?.subscriptions.paid ?? 0;
    const purchasedToday = dashboardStats?.subscriptions.purchased_today ?? 0;

    return [
      {
        icon: <StatUptimeIcon />,
        label: t('admin.panel.statsUptime'),
        value: uptime > 0 ? formatUptime(uptime) : '--',
        colorClass: 'text-success-400 bg-success-400/10 border-success-400/20',
      },
      {
        icon: <StatBotIcon />,
        label: t('admin.panel.statsBot'),
        value: systemInfo?.bot_version ?? '--',
        colorClass: 'text-primary bg-primary/10 border-primary/20',
      },
      {
        icon: <StatCabinetIcon />,
        label: t('admin.panel.statsCabinet'),
        value: `v${CABINET_VERSION}`,
        colorClass: 'text-primary/70 bg-primary/10 border-primary/20',
      },
      {
        icon: <StatTrialIcon />,
        label: t('admin.panel.statsTrials'),
        numericValue: trial,
        colorClass: 'text-warning-400 bg-warning-400/10 border-warning-400/20',
      },
      {
        icon: <StatPaidIcon />,
        label: t('admin.panel.statsPaid'),
        numericValue: paid,
        delta: purchasedToday > 0 ? `+${purchasedToday}` : undefined,
        colorClass: 'text-success-400 bg-success-400/10 border-success-400/20',
      },
    ];
  }, [systemInfo, dashboardStats, t]);

  return (
    <div className="scrollbar-hide flex w-full gap-2 overflow-x-auto pb-1">
      {stats.map((s, i) => (
        <div
          key={i}
          className={cn(
            'border-border/50 bg-card/40 flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-lg transition-all duration-200',
            '',
            loading && 'animate-pulse',
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              s.colorClass,
            )}
          >
            {s.icon}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
            <span className="text-foreground flex items-center gap-1 font-mono text-xs font-bold">
              {'numericValue' in s && s.numericValue !== undefined ? (
                <AnimatedStat value={s.numericValue} />
              ) : (
                <span className="truncate">{s.value}</span>
              )}
              {s.delta && (
                <span className="border-success-400/20 bg-success-400/10 text-2xs text-success-400 shrink-0 rounded-md border px-1.5 py-px font-semibold">
                  {s.delta}
                </span>
              )}
            </span>
            <span className="text-2xs text-muted-foreground truncate">
              {s.label}
              {s.delta && ` · ${t('admin.panel.statsToday')}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Glass Card (Section) ───

interface GlassCardProps {
  section: AdminSection;
  index: number;
  searchTerm: string;
}

const GlassCard = memo(function GlassCard({ section, index, searchTerm }: GlassCardProps) {
  const { t } = useTranslation();
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    tiltRef.current = {
      x: ((e.clientY - rect.top) / rect.height - 0.5) * -2.5,
      y: ((e.clientX - rect.left) / rect.width - 0.5) * 2.5,
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ ...tiltRef.current });
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setTilt({ x: 0, y: 0 });
  }, []);

  const visibleItems = useMemo(
    () =>
      section.items.filter((item) => {
        if (!hasPermission(item.permission)) return false;
        if (!searchTerm) return true;
        return t(item.name).toLowerCase().includes(searchTerm.toLowerCase());
      }),
    [section.items, hasPermission, searchTerm, t],
  );

  const highlightMatch = useCallback(
    (text: string) => {
      if (!searchTerm) return text;
      const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (idx === -1) return text;
      return (
        <>
          {text.slice(0, idx)}
          <mark className="bg-primary/30 text-foreground rounded-sm px-0.5">
            {text.slice(idx, idx + searchTerm.length)}
          </mark>
          {text.slice(idx + searchTerm.length)}
        </>
      );
    },
    [searchTerm],
  );

  if (visibleItems.length === 0) return null;

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="group/card border-border/50 bg-card/30 hover:border-border/80 relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:shadow-lg"
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        animation: `adminCardEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${index * 60}ms both`,
      }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 right-0 left-0 h-px opacity-50 transition-all duration-300 group-hover/card:h-0.5 group-hover/card:opacity-100"
        style={{ background: section.gradient }}
      />

      {/* Header */}
      <div className="border-border/30 flex items-center gap-2.5 border-b px-3.5 py-2.5">
        <div
          className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-md"
          style={{ background: section.gradient }}
        >
          {/* Shine overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-white/25" />
          <span className="relative text-xs font-bold text-white drop-shadow-sm" aria-hidden="true">
            {visibleItems.length}
          </span>
        </div>
        <h2 className="text-foreground truncate text-[13px] font-semibold">
          {t(section.titleKey)}
        </h2>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-px p-1.5">
        {visibleItems.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'group/item flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 transition-all duration-150',
              hoveredItem === i
                ? 'border-border/50 bg-muted/30'
                : 'hover:border-border/50 hover:bg-muted/30',
            )}
            onMouseEnter={() => setHoveredItem(i)}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              animation: `adminItemEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${index * 60 + i * 20}ms both`,
            }}
          >
            {/* Icon */}
            <div
              className="border-border/40 bg-card/40 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 group-hover/item:scale-105 [&>svg]:h-3.25 [&>svg]:w-3.25"
              style={{ color: section.accent }}
            >
              {icons[item.icon]}
            </div>

            {/* Label */}
            <span className="text-foreground group-hover/item:text-foreground flex-1 truncate text-xs font-medium transition-colors">
              {highlightMatch(t(item.name))}
            </span>

            {/* Chevron */}
            <div className="text-muted-foreground h-3 w-3 shrink-0 -translate-x-1 opacity-0 transition-all duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-60 [&>svg]:h-3 [&>svg]:w-3">
              {icons.chevron}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

// ─── Quick Actions Panel ───

const quickActions = [
  { emoji: '👥', label: 'Пользователи', to: '/admin/users' },
  { emoji: '💰', label: 'Платежи', to: '/admin/payments' },
  { emoji: '🎫', label: 'Тикеты', to: '/admin/tickets' },
  { emoji: '📢', label: 'Рассылки', to: '/admin/broadcasts' },
  { emoji: '🏷️', label: 'Промокоды', to: '/admin/promocodes' },
  { emoji: '📊', label: 'Статистика', to: '/admin/sales-stats' },
  { emoji: '🖥️', label: 'Серверы', to: '/admin/servers' },
  { emoji: '🔍', label: 'SEO', to: '/admin/seo' },
  { emoji: '⚙️', label: 'Настройки', to: '/admin/settings' },
  { emoji: '💚', label: 'Здоровье', to: '/admin/health' },
  { emoji: '🔔', label: 'Уведомления', to: '/admin/notifications' },
  { emoji: '🌐', label: 'Лендинги', to: '/admin/landings' },
];

const QuickActionsPanel = memo(function QuickActionsPanel() {
  const navigate = useNavigate();
  return (
    <div className="shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">Быстрые действия</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {quickActions.map((action) => (
          <Card
            key={action.to}
            className="border-border/50 bg-card/40 hover:border-primary/50 hover:bg-card/80 cursor-pointer backdrop-blur-lg transition-all duration-150 hover:shadow-md"
            onClick={() => navigate(action.to)}
          >
            <CardContent className="flex flex-col items-center gap-1.5 p-3">
              <span className="text-xl leading-none" aria-hidden="true">
                {action.emoji}
              </span>
              <span className="text-foreground/80 text-center text-[11px] leading-tight font-medium">
                {action.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// ─── Admin Tasks Checklist ───

interface TaskStatus {
  label: string;
  done: boolean;
}

const AdminTasksChecklist = memo(function AdminTasksChecklist() {
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkTasks = async () => {
      const results: TaskStatus[] = [
        {
          label: 'Настроен Telegram бот',
          done: !!import.meta.env.VITE_TELEGRAM_BOT_USERNAME,
        },
        { label: 'Загружен логотип', done: false },
        { label: 'Настроен SEO', done: false },
        { label: 'Созданы тарифные планы', done: false },
        { label: 'Настроены платёжные методы', done: false },
      ];

      try {
        const branding = await brandingApi.getBranding();
        results[1].done = branding.has_custom_logo;
      } catch {
        /* silent */
      }

      try {
        const seo = await brandingApi.getSeoConfig();
        results[2].done = !!seo.site_title?.trim();
      } catch {
        /* silent */
      }

      try {
        const tariffResp = await tariffsApi.getTariffs(false);
        results[3].done = (tariffResp.total ?? tariffResp.tariffs?.length ?? 0) > 0;
      } catch {
        /* silent */
      }

      try {
        const methods = await adminPaymentMethodsApi.getAll();
        results[4].done = methods.length > 0;
      } catch {
        /* silent */
      }

      if (!cancelled) {
        setTasks(results);
        setLoading(false);
      }
    };

    checkTasks();
    return () => {
      cancelled = true;
    };
  }, []);

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!loading && completedCount === totalCount) return null;

  return (
    <div className="hidden shrink-0 sm:block">
      <div className="border-border/50 bg-card/30 overflow-hidden rounded-xl border backdrop-blur-xl">
        {/* Header */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCollapsed((c) => !c)}
          className="hover:bg-muted/20 flex h-auto w-full items-center justify-start gap-2.5 rounded-none px-3.5 py-2.5 text-left"
        >
          <span className="text-foreground flex-1 text-[13px] font-semibold">
            Задачи администратора
          </span>
          {!loading && (
            <span className="text-muted-foreground text-xs">
              {completedCount} из {totalCount} выполнено
            </span>
          )}
          <div
            className={cn(
              'text-muted-foreground h-3 w-3 shrink-0 transition-transform duration-200 [&>svg]:h-3 [&>svg]:w-3',
              collapsed ? 'rotate-90' : '-rotate-90',
            )}
          >
            {icons.chevron}
          </div>
        </Button>

        {!collapsed && (
          <div className="px-3.5 pt-0 pb-3">
            {/* Progress bar */}
            {!loading && (
              <div className="mb-3">
                <Progress value={progressPct} className="h-1.5" />
              </div>
            )}

            {/* Task list */}
            <div className="flex flex-col gap-1">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted/30 h-7 animate-pulse rounded-lg"
                      style={{ animationDelay: `${i * 80}ms` }}
                    />
                  ))
                : tasks.map((task) => (
                    <div
                      key={task.label}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          task.done
                            ? 'bg-success-400/20 text-success-400'
                            : 'bg-muted/40 text-muted-foreground',
                        )}
                        aria-hidden="true"
                      >
                        {task.done ? '✓' : '✗'}
                      </span>
                      <span
                        className={cn(
                          'text-xs',
                          task.done ? 'text-muted-foreground line-through' : 'text-foreground',
                        )}
                      >
                        {task.label}
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Main Component ───

export default function AdminPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { safeAreaInset, contentSafeAreaInset } = useTelegramSDK();

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);

  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  // Fetch stats
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [sysInfo, stats] = await Promise.all([
          statsApi.getSystemInfo(),
          statsApi.getDashboardStats(),
        ]);
        if (!cancelled) {
          setSystemInfo(sysInfo);
          setDashboardStats(stats);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    // Fetch recent activity separately (non-critical, fails silently)
    const fetchActivity = async () => {
      try {
        const log = await rbacApi.getAuditLog({ limit: 5, offset: 0 });
        if (!cancelled) setRecentActivity(log.items);
      } catch {
        /* no RBAC permission — silently skip */
      }
    };
    fetchActivity();
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Keyboard shortcut: Escape to clear inline search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearch('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Track which sections have matching items (keeps original section refs for memo stability)
  const visibleSectionIds = useMemo(() => {
    if (!search.trim()) return null; // null = show all
    const lower = search.toLowerCase();
    return new Set(
      sections
        .filter((s) => s.items.some((item) => t(item.name).toLowerCase().includes(lower)))
        .map((s) => s.id),
    );
  }, [search, t]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="relative z-10 mx-auto flex w-full max-w-400 flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6"
        style={{
          paddingTop: safeTop > 0 ? `${safeTop}px` : 'env(safe-area-inset-top, 0px)',
          paddingBottom: safeBottom > 0 ? `${safeBottom}px` : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Stats Bar */}
        <div className="hidden shrink-0 sm:flex">
          <StatsBar systemInfo={systemInfo} dashboardStats={dashboardStats} loading={loading} />
        </div>

        {/* Mobile: compact 2-column stats */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:hidden">
          {[
            {
              icon: <StatUptimeIcon />,
              label: t('admin.panel.statsUptime'),
              value: systemInfo?.uptime_seconds ? formatUptime(systemInfo.uptime_seconds) : '--',
              cls: 'text-success-400',
            },
            {
              icon: <StatBotIcon />,
              label: t('admin.panel.statsBot'),
              value: systemInfo?.bot_version ?? '--',
              cls: 'text-primary',
            },
            {
              icon: <StatTrialIcon />,
              label: t('admin.panel.statsTrials'),
              value: dashboardStats?.subscriptions.trial?.toLocaleString() ?? '--',
              cls: 'text-warning-400',
            },
            {
              icon: <StatPaidIcon />,
              label: t('admin.panel.statsPaid'),
              value: dashboardStats?.subscriptions.paid?.toLocaleString() ?? '--',
              delta:
                (dashboardStats?.subscriptions.purchased_today ?? 0) > 0
                  ? `+${dashboardStats?.subscriptions.purchased_today}`
                  : undefined,
              cls: 'text-success-400',
            },
          ].map((s, i) => (
            <div
              key={i}
              className={cn(
                'border-border/50 bg-card/40 flex items-center gap-2 rounded-xl border px-2.5 py-2 backdrop-blur-lg',
                '',
                loading && 'animate-pulse',
              )}
            >
              <div className={cn('shrink-0', s.cls)}>{s.icon}</div>
              <div className="flex min-w-0 flex-col">
                <span className="text-foreground flex items-center gap-1 font-mono text-[11px] font-bold">
                  <span className="truncate">{s.value}</span>
                  {'delta' in s && s.delta && (
                    <span className="border-success-400/20 bg-success-400/10 text-2xs text-success-400 shrink-0 rounded border px-1 font-semibold">
                      {s.delta}
                    </span>
                  )}
                </span>
                <span className="text-2xs text-muted-foreground truncate">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Panel */}
        <QuickActionsPanel />

        {/* Admin Tasks Checklist */}
        <AdminTasksChecklist />

        {/* Recent Activity Feed */}
        {recentActivity.length > 0 && (
          <div className="hidden shrink-0 sm:block">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Последние действия</span>
              <Link to="/admin/audit-log" className="text-primary hover:text-primary/70 text-xs">
                Весь журнал →
              </Link>
            </div>
            <div className="scrollbar-hide flex gap-2 overflow-x-auto">
              {recentActivity.map((entry) => {
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(entry.created_at).getTime();
                  const m = Math.floor(diff / 60000);
                  if (m < 60) return `${m}м`;
                  const h = Math.floor(m / 60);
                  if (h < 24) return `${h}ч`;
                  return `${Math.floor(h / 24)}д`;
                })();
                const isOk = entry.status === 'success' || entry.status === '200';
                return (
                  <div
                    key={entry.id}
                    className="border-border/50 bg-card/40 flex min-w-45 shrink-0 flex-col gap-1 rounded-xl border px-3 py-2 backdrop-blur-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          isOk ? 'bg-success-400' : 'bg-error-400',
                        )}
                      />
                      <span className="text-foreground truncate text-xs font-medium">
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-2xs text-muted-foreground ml-auto shrink-0">
                        {timeAgo}
                      </span>
                    </div>
                    {(entry.user_first_name || entry.user_email) && (
                      <span className="text-2xs text-muted-foreground truncate">
                        {entry.user_first_name || entry.user_email}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hero + Search */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <h1 className="from-foreground via-muted to-primary/70 bg-linear-to-r bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-xl">
            {t('admin.panel.title')}
          </h1>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <div className="animate-admin-pulse bg-success-400 h-1.5 w-1.5 rounded-full shadow-[0_0_10px_color-mix(in_srgb,var(--color-success-400)_60%,transparent)]" />
            {t('admin.panel.statsOnline')}
          </div>
          {/* Search */}
          <div className="relative ml-auto max-w-90 min-w-40 flex-1">
            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {icons.search}
            </div>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.panel.searchPlaceholder')}
              aria-label={t('admin.panel.searchPlaceholder')}
              className="border-border/50 bg-card/40 text-foreground placeholder:text-muted-foreground focus:border-primary/40 w-full rounded-xl border py-2 pr-16 pl-8 font-sans text-xs backdrop-blur-lg transition-all outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_8%,transparent)]"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearch('')}
                aria-label={t('admin.panel.searchClear')}
                className="text-muted-foreground hover:text-muted-foreground absolute top-1/2 right-12 h-6 w-6 -translate-y-1/2 [&>svg]:h-3.5 [&>svg]:w-3.5"
              >
                {icons.x}
              </Button>
            )}
            <kbd
              role="button"
              tabIndex={0}
              aria-label="Открыть глобальный поиск (Ctrl+K)"
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  document.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
                  );
              }}
              className="border-border/50 bg-card/60 text-2xs text-muted-foreground hover:border-primary/40 hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-md border px-1.5 py-0.5 font-mono transition-colors"
            >
              {IS_MAC ? '\u2318' : 'Ctrl+'}K
            </kbd>
          </div>
        </div>

        {/* Grid */}
        <div className="scrollbar-hide min-h-0 flex-1 overflow-auto pb-4">
          {visibleSectionIds === null || visibleSectionIds.size > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sections
                .filter((s) => !visibleSectionIds || visibleSectionIds.has(s.id))
                .map((section, i) => (
                  <GlassCard key={section.id} section={section} index={i} searchTerm={search} />
                ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16"
              role="status"
              aria-live="polite"
            >
              <div className="border-border/50 bg-card/40 text-muted-foreground mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border backdrop-blur-lg [&>svg]:h-6 [&>svg]:w-6">
                {icons.search}
              </div>
              <h3 className="text-foreground text-sm font-semibold">
                {t('admin.panel.searchEmpty')}
              </h3>
              <p className="text-muted-foreground text-xs">{t('admin.panel.searchEmptyHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
