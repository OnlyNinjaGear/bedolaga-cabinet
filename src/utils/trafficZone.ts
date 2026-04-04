export type TrafficZone = 'normal' | 'warning' | 'danger' | 'critical';

export type TrafficColorKey = 'accent' | 'warning' | 'error';

interface TrafficZoneResult {
  zone: TrafficZone;
  textClass: string;
  dotClass: string;
  glowColor: string;
  labelKey: string;
  gradientFrom: string;
  gradientTo: string;
  /** CSS variable for the main zone color: `var(--primary)` */
  mainVar: string;
  /** Raw CSS variable reference for opacity manipulation: `var(--primary)` */
  mainVarRaw: string;
  /** Key into ThemeColors for resolving mainHex at runtime */
  colorKey: TrafficColorKey;
}

const ZONES: Record<TrafficZone, Omit<TrafficZoneResult, 'zone'>> = {
  normal: {
    textClass: 'text-primary',
    dotClass: 'bg-primary/80',
    glowColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
    labelKey: 'dashboard.zone.normal',
    gradientFrom: 'var(--primary)',
    gradientTo: 'var(--primary)',
    mainVar: 'var(--primary)',
    mainVarRaw: 'var(--primary)',
    colorKey: 'accent',
  },
  warning: {
    textClass: 'text-warning-400',
    dotClass: 'bg-warning-400',
    glowColor: 'color-mix(in srgb, var(--color-warning-500) 50%, transparent)',
    labelKey: 'dashboard.zone.warning',
    gradientFrom: 'var(--color-warning-500)',
    gradientTo: 'var(--color-warning-400)',
    mainVar: 'var(--color-warning-400)',
    mainVarRaw: 'var(--color-warning-400)',
    colorKey: 'warning',
  },
  danger: {
    textClass: 'text-warning-300',
    dotClass: 'bg-warning-300',
    glowColor: 'color-mix(in srgb, var(--color-warning-400) 50%, transparent)',
    labelKey: 'dashboard.zone.danger',
    gradientFrom: 'var(--color-warning-600)',
    gradientTo: 'var(--color-warning-400)',
    mainVar: 'var(--color-warning-400)',
    mainVarRaw: 'var(--color-warning-400)',
    colorKey: 'warning',
  },
  critical: {
    textClass: 'text-error-400',
    dotClass: 'bg-error-400',
    glowColor: 'color-mix(in srgb, var(--color-error-500) 50%, transparent)',
    labelKey: 'dashboard.zone.critical',
    gradientFrom: 'var(--color-error-500)',
    gradientTo: 'var(--color-error-400)',
    mainVar: 'var(--color-error-400)',
    mainVarRaw: 'var(--color-error-400)',
    colorKey: 'error',
  },
};

export function getTrafficZone(percent: number): TrafficZoneResult {
  let zone: TrafficZone;
  if (percent >= 90) zone = 'critical';
  else if (percent >= 75) zone = 'danger';
  else if (percent >= 50) zone = 'warning';
  else zone = 'normal';

  return { zone, ...ZONES[zone] };
}
