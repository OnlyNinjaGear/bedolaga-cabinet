import { ThemeColors, DEFAULT_THEME_COLORS } from '../../types/theme';

// Tree sidebar types
export interface TreeSubItem {
  id: string;
  categories: string[];
}

export interface TreeGroup {
  id: string;
  icon: string;
  children: TreeSubItem[];
}

export interface SpecialItem {
  id: string;
  icon?: string;
  iconType?: 'star' | null;
}

export interface SettingsTreeConfig {
  specialItems: SpecialItem[];
  groups: TreeGroup[];
}

// Hierarchical settings tree — all 61 backend category keys mapped into 7 groups
export const SETTINGS_TREE: SettingsTreeConfig = {
  specialItems: [
    { id: 'favorites', iconType: 'star' },
    { id: 'branding', icon: '🎨' },
    { id: 'theme', icon: '🌈' },
    { id: 'analytics', icon: '📊' },
    { id: 'seo', icon: '🔍' },
    { id: 'buttons', icon: '📱' },
  ],
  groups: [
    {
      id: 'payments',
      icon: '💳',
      children: [
        { id: 'payments_general', categories: ['PAYMENT', 'PAYMENT_VERIFICATION'] },
        { id: 'payments_stars', categories: ['TELEGRAM'] },
        { id: 'payments_yookassa', categories: ['YOOKASSA'] },
        { id: 'payments_cryptobot', categories: ['CRYPTOBOT'] },
        { id: 'payments_cloudpayments', categories: ['CLOUDPAYMENTS'] },
        { id: 'payments_freekassa', categories: ['FREEKASSA'] },
        { id: 'payments_kassa_ai', categories: ['KASSA_AI'] },
        { id: 'payments_platega', categories: ['PLATEGA'] },
        { id: 'payments_pal24', categories: ['PAL24'] },
        { id: 'payments_heleket', categories: ['HELEKET'] },
        { id: 'payments_mulenpay', categories: ['MULENPAY'] },
        { id: 'payments_tribute', categories: ['TRIBUTE'] },
        { id: 'payments_wata', categories: ['WATA'] },
        { id: 'payments_riopay', categories: ['RIOPAY'] },
        { id: 'payments_severpay', categories: ['SEVERPAY'] },
      ],
    },
    {
      id: 'subscriptions',
      icon: '📦',
      children: [
        { id: 'subs_core', categories: ['SUBSCRIPTIONS_CORE'] },
        { id: 'subs_trial', categories: ['TRIAL'] },
        { id: 'subs_pricing', categories: ['SUBSCRIPTION_PRICES'] },
        { id: 'subs_periods', categories: ['PERIODS'] },
        { id: 'subs_traffic', categories: ['TRAFFIC', 'TRAFFIC_PACKAGES'] },
        { id: 'subs_simple', categories: ['SIMPLE_SUBSCRIPTION'] },
        { id: 'subs_autopay', categories: ['AUTOPAY'] },
      ],
    },
    {
      id: 'interface',
      icon: '🖥️',
      children: [
        {
          id: 'iface_general',
          categories: ['INTERFACE', 'INTERFACE_BRANDING', 'INTERFACE_SUBSCRIPTION'],
        },
        { id: 'iface_connect', categories: ['CONNECT_BUTTON'] },
        { id: 'iface_miniapp', categories: ['MINIAPP'] },
        { id: 'iface_happ', categories: ['HAPP'] },
        { id: 'iface_widget', categories: ['TELEGRAM_WIDGET'] },
        { id: 'iface_oidc', categories: ['TELEGRAM_OIDC'] },
        { id: 'iface_skip', categories: ['SKIP'] },
        { id: 'iface_additional', categories: ['ADDITIONAL'] },
      ],
    },
    {
      id: 'users',
      icon: '👥',
      children: [
        { id: 'users_support', categories: ['SUPPORT'] },
        { id: 'users_referral', categories: ['REFERRAL'] },
        { id: 'users_channel', categories: ['CHANNEL'] },
        { id: 'users_localization', categories: ['LOCALIZATION', 'TIMEZONE'] },
        { id: 'users_moderation', categories: ['MODERATION', 'BAN_NOTIFICATIONS'] },
      ],
    },
    {
      id: 'notifications',
      icon: '🔔',
      children: [
        { id: 'notif_user', categories: ['NOTIFICATIONS', 'WEBHOOK_NOTIFICATIONS'] },
        { id: 'notif_admin', categories: ['ADMIN_NOTIFICATIONS'] },
        { id: 'notif_reports', categories: ['ADMIN_REPORTS'] },
      ],
    },
    {
      id: 'database',
      icon: '🗄️',
      children: [
        { id: 'db_general', categories: ['DATABASE'] },
        { id: 'db_postgres', categories: ['POSTGRES'] },
        { id: 'db_sqlite', categories: ['SQLITE'] },
        { id: 'db_redis', categories: ['REDIS'] },
      ],
    },
    {
      id: 'system',
      icon: '⚙️',
      children: [
        { id: 'sys_core', categories: ['CORE', 'DEBUG'] },
        { id: 'sys_remnawave', categories: ['REMNAWAVE'] },
        { id: 'sys_webapi', categories: ['WEB_API', 'EXTERNAL_ADMIN'] },
        { id: 'sys_webhook', categories: ['WEBHOOK'] },
        { id: 'sys_server', categories: ['SERVER_STATUS'] },
        { id: 'sys_monitoring', categories: ['MONITORING'] },
        { id: 'sys_maintenance', categories: ['MAINTENANCE'] },
        { id: 'sys_backup', categories: ['BACKUP'] },
        { id: 'sys_version', categories: ['VERSION'] },
        { id: 'sys_logging', categories: ['LOG'] },
      ],
    },
  ],
};

// Helper: find which group and sub-item a backend category key belongs to
export function findTreeLocation(
  categoryKey: string,
): { groupId: string; subItemId: string } | null {
  for (const group of SETTINGS_TREE.groups) {
    for (const child of group.children) {
      if (child.categories.includes(categoryKey)) {
        return { groupId: group.id, subItemId: child.id };
      }
    }
  }
  return null;
}

// Helper: get all backend category keys for a given sub-item id
export function getCategoriesForSubItem(subItemId: string): string[] {
  for (const group of SETTINGS_TREE.groups) {
    const child = group.children.find((c) => c.id === subItemId);
    if (child) return child.categories;
  }
  return [];
}

// Theme preset type
export interface ThemePreset {
  id: string;
  colors: ThemeColors;
}

// shadcn-compatible theme presets
export const THEME_PRESETS: ThemePreset[] = [
  { id: 'zinc', colors: DEFAULT_THEME_COLORS },
  {
    id: 'slate',
    colors: {
      accent: '#0ea5e9',
      darkBackground: '#020617',
      darkSurface: '#0f172a',
      darkText: '#f8fafc',
      darkTextSecondary: '#94a3b8',
      lightBackground: '#f8fafc',
      lightSurface: '#ffffff',
      lightText: '#0f172a',
      lightTextSecondary: '#64748b',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'stone',
    colors: {
      accent: '#f97316',
      darkBackground: '#0c0a09',
      darkSurface: '#1c1917',
      darkText: '#fafaf9',
      darkTextSecondary: '#a8a29e',
      lightBackground: '#fafaf9',
      lightSurface: '#ffffff',
      lightText: '#1c1917',
      lightTextSecondary: '#78716c',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'neutral',
    colors: {
      accent: '#6366f1',
      darkBackground: '#0a0a0a',
      darkSurface: '#171717',
      darkText: '#fafafa',
      darkTextSecondary: '#a3a3a3',
      lightBackground: '#fafafa',
      lightSurface: '#ffffff',
      lightText: '#171717',
      lightTextSecondary: '#737373',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'blue',
    colors: {
      accent: '#3b82f6',
      darkBackground: '#020817',
      darkSurface: '#0f1729',
      darkText: '#f8fafc',
      darkTextSecondary: '#94a3b8',
      lightBackground: '#eff6ff',
      lightSurface: '#ffffff',
      lightText: '#1e3a5f',
      lightTextSecondary: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'green',
    colors: {
      accent: '#22c55e',
      darkBackground: '#030712',
      darkSurface: '#052e16',
      darkText: '#f0fdf4',
      darkTextSecondary: '#86efac',
      lightBackground: '#f0fdf4',
      lightSurface: '#ffffff',
      lightText: '#14532d',
      lightTextSecondary: '#16a34a',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'rose',
    colors: {
      accent: '#f43f5e',
      darkBackground: '#0c0a09',
      darkSurface: '#1c1917',
      darkText: '#fafaf9',
      darkTextSecondary: '#a8a29e',
      lightBackground: '#fff1f2',
      lightSurface: '#ffffff',
      lightText: '#1c1917',
      lightTextSecondary: '#e11d48',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'violet',
    colors: {
      accent: '#a855f7',
      darkBackground: '#09090b',
      darkSurface: '#18181b',
      darkText: '#fafafa',
      darkTextSecondary: '#a1a1aa',
      lightBackground: '#faf5ff',
      lightSurface: '#ffffff',
      lightText: '#18181b',
      lightTextSecondary: '#7c3aed',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
];
