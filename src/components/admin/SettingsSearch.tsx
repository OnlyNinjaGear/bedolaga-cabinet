import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingDefinition } from '../../api/adminSettings';
import { SearchIcon, CloseIcon } from './icons';
import { formatSettingKey } from './utils';
import { Button } from '@/components/ui/button';

interface SettingsSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultsCount?: number;
  allSettings?: SettingDefinition[];
  onSelectSetting?: (setting: SettingDefinition) => void;
}

export function SettingsSearch({
  searchQuery,
  setSearchQuery,
  allSettings,
  onSelectSetting,
}: SettingsSearchProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter settings for autocomplete
  const suggestions =
    searchQuery.trim() && allSettings
      ? allSettings
          .filter((s) => {
            const q = searchQuery.toLowerCase().trim();
            if (s.key.toLowerCase().includes(q)) return true;
            if (s.name?.toLowerCase().includes(q)) return true;
            const formattedKey = formatSettingKey(s.name || s.key);
            const translatedName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
            if (translatedName.toLowerCase().includes(q)) return true;
            if (s.hint?.description?.toLowerCase().includes(q)) return true;
            const categoryLabel = t(`admin.settings.categories.${s.category.key}`, s.category.key);
            if (categoryLabel.toLowerCase().includes(q)) return true;
            return false;
          })
          .slice(0, 8)
      : [];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (setting: SettingDefinition) => {
    setIsOpen(false);
    setSearchQuery(setting.name || setting.key);
    onSelectSetting?.(setting);
  };

  const getSettingDisplayName = (setting: SettingDefinition) => {
    const formattedKey = formatSettingKey(setting.name || setting.key);
    return t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  };

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t('admin.settings.searchPlaceholder')}
        className="border-border bg-card text-foreground placeholder-muted-foreground focus:border-primary w-48 rounded-xl border py-2 pr-10 pl-10 text-sm focus:outline-none lg:w-64"
      />
      <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
        <SearchIcon />
      </div>
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSearchQuery('');
            setIsOpen(false);
          }}
          className="text-muted-foreground hover:text-muted-foreground absolute top-1/2 right-3 h-auto w-auto -translate-y-1/2 p-0"
        >
          <CloseIcon />
        </Button>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="border-border bg-card absolute top-full right-0 z-50 mt-1 max-h-80 w-80 overflow-y-auto rounded-xl border py-1 shadow-xl">
          {suggestions.map((setting, index) => (
            <Button
              key={setting.key}
              variant="ghost"
              onClick={() => handleSelect(setting)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex h-auto w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                index === highlightedIndex ? 'bg-primary/20' : ''
              }`}
            >
              <span className="text-foreground truncate text-sm font-medium">
                {getSettingDisplayName(setting)}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {t(`admin.settings.categories.${setting.category.key}`, setting.category.key)}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsSearchMobile({
  searchQuery,
  setSearchQuery,
  allSettings,
  onSelectSetting,
}: Omit<SettingsSearchProps, 'resultsCount'>) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter settings for autocomplete
  const suggestions =
    searchQuery.trim() && allSettings
      ? allSettings
          .filter((s) => {
            const q = searchQuery.toLowerCase().trim();
            if (s.key.toLowerCase().includes(q)) return true;
            if (s.name?.toLowerCase().includes(q)) return true;
            const formattedKey = formatSettingKey(s.name || s.key);
            const translatedName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
            if (translatedName.toLowerCase().includes(q)) return true;
            if (s.hint?.description?.toLowerCase().includes(q)) return true;
            const categoryLabel = t(`admin.settings.categories.${s.category.key}`, s.category.key);
            if (categoryLabel.toLowerCase().includes(q)) return true;
            return false;
          })
          .slice(0, 8)
      : [];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length, searchQuery]);

  const handleSelect = (setting: SettingDefinition) => {
    setIsOpen(false);
    setSearchQuery(setting.name || setting.key);
    onSelectSetting?.(setting);
  };

  const getSettingDisplayName = (setting: SettingDefinition) => {
    const formattedKey = formatSettingKey(setting.name || setting.key);
    return t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  };

  return (
    <div ref={containerRef} className="relative mt-3 lg:hidden">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={t('admin.settings.searchPlaceholder')}
        className="border-border bg-card text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-xl border py-2 pr-10 pl-10 text-sm focus:outline-none"
      />
      <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
        <SearchIcon />
      </div>
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSearchQuery('');
            setIsOpen(false);
          }}
          className="text-muted-foreground hover:text-muted-foreground absolute top-1/2 right-3 h-auto w-auto -translate-y-1/2 p-0"
        >
          <CloseIcon />
        </Button>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="border-border bg-card absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border py-1 shadow-xl">
          {suggestions.map((setting, index) => (
            <Button
              key={setting.key}
              variant="ghost"
              onClick={() => handleSelect(setting)}
              className={`flex h-auto w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                index === highlightedIndex ? 'bg-primary/20' : ''
              }`}
            >
              <span className="text-foreground truncate text-sm font-medium">
                {getSettingDisplayName(setting)}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {t(`admin.settings.categories.${setting.category.key}`, setting.category.key)}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsSearchResults({
  searchQuery,
  resultsCount,
}: {
  searchQuery: string;
  resultsCount: number;
}) {
  const { t } = useTranslation();

  if (!searchQuery.trim()) return null;

  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        {resultsCount > 0
          ? t('admin.settings.foundCount', { count: resultsCount })
          : t('admin.settings.notFound')}
      </span>
      {resultsCount > 0 && (
        <span className="text-muted-foreground">
          {t('admin.settings.byQuery', { query: searchQuery })}
        </span>
      )}
    </div>
  );
}
