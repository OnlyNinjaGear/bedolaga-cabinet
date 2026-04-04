import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SALES_STATS } from '../../constants/salesStats';
import { Button } from '@/components/ui/button';

interface PeriodSelectorProps {
  value: { days?: number; startDate?: string; endDate?: string };
  onChange: (period: { days?: number; startDate?: string; endDate?: string }) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);

  const presetLabels: Record<number, string> = {
    7: t('admin.salesStats.period.week'),
    30: t('admin.salesStats.period.month'),
    90: t('admin.salesStats.period.quarter'),
    0: t('admin.salesStats.period.all'),
  };

  const handlePreset = (days: number) => {
    setShowCustom(false);
    onChange({ days });
  };

  const handleCustomToggle = () => {
    setShowCustom((prev) => !prev);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', dateStr: string) => {
    onChange({
      ...value,
      days: undefined,
      [field]: dateStr,
    });
  };

  const isPresetActive = (days: number) => !showCustom && value.days === days;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SALES_STATS.PERIOD_PRESETS.map((days) => (
        <Button
          key={days}
          type="button"
          variant="ghost"
          onClick={() => handlePreset(days)}
          className={`h-auto rounded-lg px-3 py-1.5 text-sm font-medium ${
            isPresetActive(days)
              ? 'bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary'
              : 'bg-card/50 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground'
          }`}
        >
          {presetLabels[days]}
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        onClick={handleCustomToggle}
        className={`h-auto rounded-lg px-3 py-1.5 text-sm font-medium ${
          showCustom
            ? 'bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary'
            : 'bg-card/50 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground'
        }`}
      >
        {t('admin.salesStats.period.custom')}
      </Button>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.startDate || ''}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="border-border bg-card text-foreground rounded-lg border px-2 py-1 text-sm"
          />
          <span className="text-muted-foreground">{'\u2014'}</span>
          <input
            type="date"
            value={value.endDate || ''}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="border-border bg-card text-foreground rounded-lg border px-2 py-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}
