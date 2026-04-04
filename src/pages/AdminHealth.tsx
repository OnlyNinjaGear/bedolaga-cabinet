import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminHealthApi, type SystemHealthResponse } from '../api/adminHealth';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

// ─── Icons ───────────────────────────────────────────────────────────────────

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.185M2.985 14.652"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const HeartPulseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const RedisIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const ApiIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
    />
  </svg>
);

const BotIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v1.5M15.75 3v1.5M8.25 19.5V21M15.75 19.5V21M3 8.25h1.5M19.5 8.25H21M3 15.75h1.5M19.5 15.75H21M8.25 4.5h7.5A2.25 2.25 0 0118 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 016 17.25V6.75A2.25 2.25 0 018.25 4.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9h.008v.008H9.75V9zm4.5 0h.008v.008h-.008V9zM12 13.5a1.5 1.5 0 01-1.5-1.5h3a1.5 1.5 0 01-1.5 1.5z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7v5l3 3" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

type HealthStatusValue = 'healthy' | 'degraded' | 'down';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const STATUS_STYLES: Record<
  HealthStatusValue,
  { text: string; bg: string; icon: React.ReactNode }
> = {
  healthy: {
    text: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <CheckCircleIcon />,
  },
  degraded: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: <ExclamationIcon />,
  },
  down: {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: <XCircleIcon />,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ServiceCardProps {
  name: string;
  icon: React.ReactNode;
  status: HealthStatusValue;
  latencyMs: number;
  statusLabel: string;
}

function ServiceCard({ name, icon, status, latencyMs, statusLabel }: ServiceCardProps) {
  const styles = STATUS_STYLES[status];
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-2">
            {icon}
            <span className="text-foreground text-sm font-medium">{name}</span>
          </div>
          <Badge className={`${styles.bg} ${styles.text} border-0 text-xs`}>
            <span className="flex items-center gap-1">
              <span className={styles.text}>{styles.icon}</span>
              {statusLabel}
            </span>
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">{latencyMs} ms</div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminHealth() {
  const { t } = useTranslation();
  const [data, setData] = useState<SystemHealthResponse | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminHealthApi.getHealth();
      setData(result);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    intervalRef.current = setInterval(() => void fetchHealth(), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchHealth]);

  const overallStyles =
    data && data.overall ? STATUS_STYLES[data.overall] : STATUS_STYLES['healthy'];

  const memoryPercent =
    data && data.memory_total_mb > 0
      ? Math.round((data.memory_used_mb / data.memory_total_mb) * 100)
      : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-8">
      <AdminBackButton />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <HeartPulseIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('admin.health.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.health.subtitle')}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchHealth()}
          disabled={loading}
          className="shrink-0"
        >
          <span className={loading ? 'animate-spin' : ''}>
            <RefreshIcon />
          </span>
        </Button>
      </div>

      {/* Not configured empty state */}
      {data === null && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HeartPulseIcon />
            <p className="text-muted-foreground mt-3">{t('admin.health.notConfigured')}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {data === undefined && (
        <Card className="border-border/50 animate-pulse">
          <CardContent className="h-24 py-6" />
        </Card>
      )}

      {data && (
        <>
          {/* Overall status banner */}
          <Card className={`border-0 ${overallStyles.bg}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={overallStyles.text}>{overallStyles.icon}</span>
              <div>
                <p className="text-muted-foreground text-xs">{t('admin.health.overall')}</p>
                <p className={`text-base font-semibold ${overallStyles.text}`}>
                  {t(`admin.health.status.${data.overall}`)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <div>
            <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
              {t('admin.health.services')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ServiceCard
                name={t('admin.health.database')}
                icon={<DatabaseIcon />}
                status={data.database.status}
                latencyMs={data.database.latency_ms}
                statusLabel={t(`admin.health.status.${data.database.status}`)}
              />
              <ServiceCard
                name={t('admin.health.redis')}
                icon={<RedisIcon />}
                status={data.redis.status}
                latencyMs={data.redis.latency_ms}
                statusLabel={t(`admin.health.status.${data.redis.status}`)}
              />
              <ServiceCard
                name={t('admin.health.api')}
                icon={<ApiIcon />}
                status={data.api.status}
                latencyMs={data.api.latency_ms}
                statusLabel={t(`admin.health.status.${data.api.status}`)}
              />
              <ServiceCard
                name={t('admin.health.bot')}
                icon={<BotIcon />}
                status={data.bot.status}
                latencyMs={data.bot.latency_ms}
                statusLabel={t(`admin.health.status.${data.bot.status}`)}
              />
            </div>
          </div>

          {/* System Metrics */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                {t('admin.health.metrics')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Uptime */}
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <ClockIcon />
                  {t('admin.health.uptime')}
                </div>
                <span className="text-sm font-medium">{formatUptime(data.uptime_seconds)}</span>
              </div>

              {/* Memory */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.health.memory')}</span>
                  <span className="text-xs font-medium">
                    {data.memory_used_mb} / {data.memory_total_mb} MB ({memoryPercent}%)
                  </span>
                </div>
                <Progress value={memoryPercent} className="h-2" />
              </div>

              {/* CPU */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.health.cpu')}</span>
                  <span className="text-xs font-medium">{data.cpu_percent}%</span>
                </div>
                <Progress value={data.cpu_percent} className="h-2" />
              </div>

              {/* Version */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('admin.health.version')}</span>
                <span className="font-mono text-sm font-medium">{data.version}</span>
              </div>
            </CardContent>
          </Card>

          {/* Last checked */}
          {lastRefreshed && (
            <p className="text-muted-foreground text-center text-xs">
              {t('admin.health.lastChecked')}: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
