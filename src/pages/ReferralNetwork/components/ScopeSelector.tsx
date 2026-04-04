import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { referralNetworkApi } from '@/api/referralNetwork';
import { MAX_SCOPE_ITEMS } from '@/store/referralNetwork';
import type { ScopeSelection, ScopeType } from '@/types/referralNetwork';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScopeSelectorProps {
  value: ScopeSelection[];
  onAdd: (selection: ScopeSelection) => void;
  onRemove: (type: ScopeSelection['type'], id: number) => void;
  onClear: () => void;
  className?: string;
}

const SCOPE_TABS: ScopeType[] = ['campaign', 'partner', 'user'];

const CHIP_COLORS: Record<ScopeType, string> = {
  campaign: 'bg-success-500/20 text-success-400',
  partner: 'bg-warning-500/20 text-warning-400',
  user: 'bg-primary/20 text-primary',
};

// Reuse CHIP_COLORS for avatar backgrounds (same palette)
const AVATAR_COLORS = CHIP_COLORS;

const AVATAR_LETTERS: Record<ScopeType, string> = {
  campaign: 'C',
  partner: 'P',
  user: 'U',
};

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CloseIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Spinner({ size = 'h-5 w-5' }: { size?: string }) {
  return (
    <div
      className={`${size} border-border border-t-accent-400 animate-spin rounded-full border-2`}
    />
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <div className="text-muted-foreground px-4 py-3 text-center text-sm">{text}</div>;
}

interface ScopeListItemProps {
  type: ScopeType;
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
}

function ScopeListItem({ type, selected, onClick, title, subtitle, badge }: ScopeListItemProps) {
  return (
    <Button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      variant="ghost"
      className={cn(
        'flex h-auto w-full items-center justify-start gap-3 px-4 py-2.5 text-left',
        selected && 'bg-muted/30',
      )}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${AVATAR_COLORS[type]}`}
      >
        {selected ? <CheckIcon /> : AVATAR_LETTERS[type]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{title}</p>
        <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
      </div>
      {badge}
    </Button>
  );
}

export function ScopeSelector({ value, onAdd, onRemove, onClear, className }: ScopeSelectorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ScopeType>('campaign');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedUserQuery, setDebouncedUserQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMaxReached = value.length >= MAX_SCOPE_ITEMS;

  const { data: scopeOptions, isLoading: isScopeLoading } = useQuery({
    queryKey: ['referral-network', 'scope-options'],
    queryFn: referralNetworkApi.getScopeOptions,
    staleTime: 120_000,
  });

  // Debounce user search
  useEffect(() => {
    if (activeTab !== 'user') return;
    const timer = setTimeout(() => {
      setDebouncedUserQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, activeTab]);

  const { data: userSearchResults, isFetching: isUserSearching } = useQuery({
    queryKey: ['referral-network-search', debouncedUserQuery],
    queryFn: () => referralNetworkApi.search(debouncedUserQuery),
    enabled: activeTab === 'user' && debouncedUserQuery.length >= 2,
    staleTime: 30_000,
  });

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      inputRef.current?.focus();
    }
  }, [isDropdownOpen]);

  // Close dropdown on outside click or Escape key (only when open)
  useEffect(() => {
    if (!isDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  const selectedSet = useMemo(() => new Set(value.map((s) => `${s.type}:${s.id}`)), [value]);

  const isSelected = useCallback(
    (type: ScopeType, id: number): boolean => selectedSet.has(`${type}:${id}`),
    [selectedSet],
  );

  // Filter campaigns/partners by local search input
  const filteredCampaigns = useMemo(() => {
    if (!scopeOptions) return [];
    const q = searchInput.toLowerCase().trim();
    if (!q) return scopeOptions.campaigns;
    return scopeOptions.campaigns.filter(
      (c) => c.name.toLowerCase().includes(q) || c.start_parameter.toLowerCase().includes(q),
    );
  }, [scopeOptions, searchInput]);

  const filteredPartners = useMemo(() => {
    if (!scopeOptions) return [];
    const q = searchInput.toLowerCase().trim();
    if (!q) return scopeOptions.partners;
    return scopeOptions.partners.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q)),
    );
  }, [scopeOptions, searchInput]);

  function handleTabChange(tab: ScopeType) {
    setActiveTab(tab);
    setSearchInput('');
    setDebouncedUserQuery('');
    setIsDropdownOpen(true);
    inputRef.current?.focus();
  }

  function handleToggle(type: ScopeType, id: number, label: string) {
    if (isSelected(type, id)) {
      onRemove(type, id);
    } else {
      if (isMaxReached) return;
      onAdd({ type, id, label });
      if (type === 'user') {
        setSearchInput('');
        setDebouncedUserQuery('');
      }
    }
  }

  const tabLabels = useMemo<Record<ScopeType, string>>(
    () => ({
      campaign: t('admin.referralNetwork.scope.campaign'),
      partner: t('admin.referralNetwork.scope.partner'),
      user: t('admin.referralNetwork.scope.user'),
    }),
    [t],
  );

  const placeholders = useMemo<Record<ScopeType, string>>(
    () => ({
      campaign: t('admin.referralNetwork.scope.selectCampaign'),
      partner: t('admin.referralNetwork.scope.selectPartner'),
      user: t('admin.referralNetwork.scope.selectUser'),
    }),
    [t],
  );

  const isLoading = activeTab === 'user' ? isUserSearching : isScopeLoading;

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/* Chips row + add trigger */}
      <div className="flex items-center gap-1.5">
        {/* Selected chips */}
        {value.length > 0 && (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {value.map((item) => (
              <span
                key={`${item.type}:${item.id}`}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${CHIP_COLORS[item.type]}`}
              >
                <span className="max-w-30 truncate">{item.label}</span>
                <Button
                  onClick={() => onRemove(item.type, item.id)}
                  aria-label={t('admin.referralNetwork.scope.removeItem', { label: item.label })}
                  variant="ghost"
                  size="icon-xs"
                  className="ml-0.5 hover:bg-white/10"
                >
                  <CloseIcon />
                </Button>
              </span>
            ))}
            {/* Clear all (only when 2+ items) */}
            {value.length > 1 && (
              <Button
                onClick={onClear}
                aria-label={t('admin.referralNetwork.scope.clearAll')}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Add button */}
        <Button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          aria-label={t('admin.referralNetwork.scope.addScope')}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          variant="outline"
          size="icon"
          className="hover:border-primary/50 hover:text-primary shrink-0"
          disabled={isMaxReached && !isDropdownOpen}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Button>
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          className="border-border/50 bg-card absolute top-full right-0 left-0 z-50 mt-1 rounded-xl border shadow-xl backdrop-blur-md"
          role="dialog"
          aria-label={t('admin.referralNetwork.scope.addScope')}
        >
          {/* Max reached banner */}
          {isMaxReached && (
            <div className="border-border/50 text-warning-400 border-b px-3 py-1.5 text-center text-xs">
              {t('admin.referralNetwork.scope.maxReached', { max: MAX_SCOPE_ITEMS })}
            </div>
          )}

          {/* Tab bar + search input */}
          <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
            <div
              className="border-border/50 bg-background flex shrink-0 rounded-lg border p-0.5"
              role="tablist"
            >
              {SCOPE_TABS.map((tab) => (
                <Button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => handleTabChange(tab)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'rounded-md px-2.5 py-1',
                    activeTab === tab
                      ? 'bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tabLabels[tab]}
                </Button>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              <svg
                className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                maxLength={200}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={placeholders[activeTab]}
                className="border-border/50 bg-background/50 text-foreground placeholder-muted-foreground focus:border-primary/50 focus:ring-ring/30 w-full rounded-lg border py-1.5 pr-8 pl-8 text-sm transition-colors outline-none focus:ring-1"
              />
              {isLoading && (
                <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
                  <Spinner size="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto" role="listbox" aria-multiselectable="true">
            {activeTab === 'campaign' && renderCampaignList()}
            {activeTab === 'partner' && renderPartnerList()}
            {activeTab === 'user' && renderUserList()}
          </div>
        </div>
      )}
    </div>
  );

  function renderCampaignList() {
    if (isScopeLoading) {
      return (
        <div className="flex items-center justify-center px-4 py-6">
          <Spinner />
        </div>
      );
    }

    if (filteredCampaigns.length === 0) {
      return <EmptyMessage text={t('admin.referralNetwork.scope.noResults')} />;
    }

    return filteredCampaigns.map((campaign) => (
      <ScopeListItem
        key={campaign.id}
        type="campaign"
        selected={isSelected('campaign', campaign.id)}
        onClick={() => handleToggle('campaign', campaign.id, campaign.name)}
        title={campaign.name}
        subtitle={`${campaign.start_parameter} / ${campaign.direct_users} ${t('admin.referralNetwork.scope.users')}`}
        badge={
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              campaign.is_active
                ? 'bg-success-500/20 text-success-400'
                : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            {campaign.is_active
              ? t('admin.referralNetwork.scope.active')
              : t('admin.referralNetwork.scope.inactive')}
          </span>
        }
      />
    ));
  }

  function renderPartnerList() {
    if (isScopeLoading) {
      return (
        <div className="flex items-center justify-center px-4 py-6">
          <Spinner />
        </div>
      );
    }

    if (filteredPartners.length === 0) {
      return <EmptyMessage text={t('admin.referralNetwork.scope.noResults')} />;
    }

    return filteredPartners.map((partner) => (
      <ScopeListItem
        key={partner.id}
        type="partner"
        selected={isSelected('partner', partner.id)}
        onClick={() => handleToggle('partner', partner.id, partner.display_name)}
        title={partner.display_name}
        subtitle={`${partner.username ? `@${partner.username} / ` : ''}${partner.campaign_count} ${t('admin.referralNetwork.scope.campaigns')}`}
      />
    ));
  }

  function renderUserList() {
    if (debouncedUserQuery.length < 2) {
      return <EmptyMessage text={t('admin.referralNetwork.scope.selectUser')} />;
    }

    if (isUserSearching) {
      return (
        <div className="flex items-center justify-center px-4 py-6">
          <Spinner />
        </div>
      );
    }

    const users = userSearchResults?.users ?? [];

    if (users.length === 0) {
      return <EmptyMessage text={t('admin.referralNetwork.scope.noResults')} />;
    }

    return users.map((user) => (
      <ScopeListItem
        key={user.id}
        type="user"
        selected={isSelected('user', user.id)}
        onClick={() => handleToggle('user', user.id, user.display_name)}
        title={user.display_name}
        subtitle={`${user.username ? `@${user.username}` : ''}${user.tg_id ? ` #${user.tg_id}` : ''}`}
        badge={
          user.is_partner ? (
            <span className="bg-warning-500/20 text-warning-400 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
              {t('admin.referralNetwork.user.partner')}
            </span>
          ) : undefined
        }
      />
    ));
  }
}
