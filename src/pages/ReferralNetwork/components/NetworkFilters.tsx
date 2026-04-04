import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReferralNetworkStore } from '@/store/referralNetwork';
import type { NetworkGraphData } from '@/types/referralNetwork';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface NetworkFiltersProps {
  data: NetworkGraphData;
  className?: string;
}

/**
 * @deprecated No longer used in the main page — replaced by ScopeSelector.
 * Kept for potential future reuse.
 */
export function NetworkFilters({ data, className }: NetworkFiltersProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  const filters = useReferralNetworkStore((s) => s.filters);
  const updateFilters = useReferralNetworkStore((s) => s.updateFilters);
  const resetFilters = useReferralNetworkStore((s) => s.resetFilters);
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    filters.campaigns.length > 0 || filters.partnersOnly || filters.minReferrals > 0;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, setIsOpen]);

  function toggleCampaign(campaignId: number) {
    const current = filters.campaigns;
    const next = current.includes(campaignId)
      ? current.filter((id) => id !== campaignId)
      : [...current, campaignId];
    updateFilters({ campaigns: next });
  }

  const panelContent = (
    <div className="space-y-4">
      {/* Campaigns */}
      {data.campaigns.length > 0 && (
        <div>
          <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
            {t('admin.referralNetwork.filters.campaigns')}
          </label>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {data.campaigns.map((campaign) => (
              <label
                key={campaign.id}
                className="hover:bg-card/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-colors"
              >
                <Checkbox
                  checked={filters.campaigns.includes(campaign.id)}
                  onCheckedChange={() => toggleCampaign(campaign.id)}
                />
                <span className="text-foreground truncate">{campaign.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Partners only */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox
          checked={filters.partnersOnly}
          onCheckedChange={(checked) => updateFilters({ partnersOnly: checked as boolean })}
        />
        <span className="text-foreground">{t('admin.referralNetwork.filters.partnersOnly')}</span>
      </label>

      {/* Min referrals */}
      <div>
        <label className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-medium">
          <span>{t('admin.referralNetwork.filters.minReferrals')}</span>
          <span className="text-muted-foreground font-mono">{filters.minReferrals}</span>
        </label>
        <input
          type="range"
          min={0}
          max={50}
          value={filters.minReferrals}
          onChange={(e) => updateFilters({ minReferrals: Number(e.target.value) })}
          className="accent-accent-500 w-full"
        />
      </div>

      {/* Reset */}
      <Button onClick={resetFilters} variant="outline" size="sm" className="w-full">
        {t('admin.referralNetwork.filters.reset')}
      </Button>
    </div>
  );

  return (
    <div ref={panelRef} className={`relative shrink-0 ${className ?? ''}`}>
      {/* Trigger button — always rendered */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('admin.referralNetwork.filters.title')}
        variant={isOpen ? 'default' : 'outline'}
        className="relative gap-2"
      >
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
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
        <span className="hidden sm:inline">{t('admin.referralNetwork.filters.title')}</span>
        {hasActiveFilters && (
          <span className="bg-primary absolute -top-1 -right-1 h-2 w-2 rounded-full" />
        )}
      </Button>

      {/* Desktop: absolute dropdown below button */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-2 hidden sm:block">
          <div className="border-border/50 bg-background/95 w-64 rounded-xl border p-4 shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground text-sm font-semibold">
                {t('admin.referralNetwork.filters.title')}
              </h3>
              <Button
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
                variant="ghost"
                size="icon"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            {panelContent}
          </div>
        </div>
      )}

      {/* Mobile: full-screen overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 top-0 z-50 sm:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="border-border/50 bg-background/95 relative mx-3 mt-3 rounded-xl border p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground text-sm font-semibold">
                {t('admin.referralNetwork.filters.title')}
              </h3>
              <Button
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
                variant="ghost"
                size="icon"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            {panelContent}
          </div>
        </div>
      )}
    </div>
  );
}
