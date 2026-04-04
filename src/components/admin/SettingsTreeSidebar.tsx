import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SETTINGS_TREE } from './constants';
import { StarIcon, SearchIcon, CloseIcon, ChevronDownIcon } from './icons';
import { SettingDefinition } from '../../api/adminSettings';
import { formatSettingKey } from './utils';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';

interface SettingsTreeSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  favoritesCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allSettings?: SettingDefinition[];
  onSelectSetting?: (setting: SettingDefinition) => void;
  className?: string;
}

export function SettingsTreeSidebar({
  activeSection,
  onSectionChange,
  favoritesCount,
  searchQuery,
  onSearchChange,
  allSettings,
  onSelectSetting,
  className,
}: SettingsTreeSidebarProps) {
  const { t } = useTranslation();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-expand the group containing the active section
  useEffect(() => {
    for (const group of SETTINGS_TREE.groups) {
      if (group.children.some((child) => child.id === activeSection)) {
        setExpandedGroup(group.id);
        return;
      }
    }
  }, [activeSection]);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
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
    if (!isSearchOpen || suggestions.length === 0) return;

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
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsSearchOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectSuggestion = (setting: SettingDefinition) => {
    setIsSearchOpen(false);
    onSearchChange(setting.name || setting.key);
    onSelectSetting?.(setting);
  };

  const getSettingDisplayName = (setting: SettingDefinition) => {
    const formattedKey = formatSettingKey(setting.name || setting.key);
    return t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  };

  const handleGroupToggle = (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      // Auto-select first child when expanding
      const group = SETTINGS_TREE.groups.find((g) => g.id === groupId);
      if (group && group.children.length > 0) {
        onSectionChange(group.children[0].id);
      }
    }
  };

  const isGroupActive = (groupId: string) => {
    const group = SETTINGS_TREE.groups.find((g) => g.id === groupId);
    return group?.children.some((child) => child.id === activeSection) ?? false;
  };

  // Special items excluding favorites (favorites is rendered separately)
  const customizationItems = SETTINGS_TREE.specialItems.filter((item) => item.id !== 'favorites');

  return (
    <nav className={cn('flex flex-col', className)}>
      {/* Search bar */}
      <div ref={searchContainerRef} className="relative px-3 pt-3 pb-2">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('admin.settings.searchPlaceholder')}
          className="border-border/50 bg-card/50 text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border py-2 pr-8 pl-9 text-sm transition-colors focus:outline-none"
        />
        <div className="text-muted-foreground absolute top-1/2 left-6 -translate-y-1/2">
          <SearchIcon className="h-4 w-4" />
        </div>
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onSearchChange('');
              setIsSearchOpen(false);
            }}
            className="text-muted-foreground hover:text-muted-foreground absolute top-1/2 right-6 h-auto w-auto -translate-y-1/2 p-0"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Autocomplete dropdown */}
        {isSearchOpen && suggestions.length > 0 && (
          <div className="border-border bg-card absolute top-full right-3 left-3 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border py-1 shadow-xl">
            {suggestions.map((setting, index) => (
              <Button
                key={setting.key}
                variant="ghost"
                onClick={() => handleSelectSuggestion(setting)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'flex h-auto w-full flex-col items-start gap-0.5 px-3 py-2 text-left',
                  index === highlightedIndex ? 'bg-primary/20' : '',
                )}
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

      {/* Favorites button */}
      <div className="px-3 pb-1">
        <Button
          variant="ghost"
          onClick={() => onSectionChange('favorites')}
          className={cn(
            'flex h-auto w-full items-center gap-3 px-3 py-2',
            activeSection === 'favorites'
              ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
              : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
          )}
        >
          <StarIcon className="h-4 w-4" filled={activeSection === 'favorites'} />
          <span className="text-sm font-medium">{t('admin.settings.favorites', 'Favorites')}</span>
          {favoritesCount > 0 && (
            <span
              className={cn(
                'ml-auto rounded-full px-2 py-0.5 text-xs',
                activeSection === 'favorites'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-warning-500/20 text-warning-400',
              )}
            >
              {favoritesCount}
            </span>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="border-border/50 mx-3 border-t" />

      {/* Customization section label */}
      <div className="px-6 pt-3 pb-1">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          {t('admin.settings.customization', 'Customization')}
        </span>
      </div>

      {/* Special items (branding, theme, analytics, buttons) */}
      <div className="space-y-0.5 px-3 pb-1">
        {customizationItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex h-auto w-full items-center gap-3 px-3 py-2',
                isActive
                  ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
              )}
            >
              {item.icon && <span className="text-sm">{item.icon}</span>}
              <span className="text-sm font-medium">{t(`admin.settings.${item.id}`, item.id)}</span>
            </Button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-border/50 mx-3 border-t" />

      {/* Settings section label */}
      <div className="px-6 pt-3 pb-1">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          {t('admin.settings.settingsLabel', 'Settings')}
        </span>
      </div>

      {/* Tree groups */}
      <div className="space-y-0.5 px-3 pb-3">
        {SETTINGS_TREE.groups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const hasActiveChild = isGroupActive(group.id);

          return (
            <div key={group.id}>
              {/* Group header */}
              <Button
                variant="ghost"
                onClick={() => handleGroupToggle(group.id)}
                className={cn(
                  'flex h-auto w-full items-center gap-3 px-3 py-2',
                  hasActiveChild
                    ? 'text-primary/70 hover:text-primary/70'
                    : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
                )}
              >
                <span className="text-sm">{group.icon}</span>
                <span className="flex-1 text-left text-sm font-medium">
                  {t(`admin.settings.groups.${group.id}`, group.id)}
                </span>
                <ChevronDownIcon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isExpanded && 'rotate-180',
                  )}
                />
              </Button>

              {/* Children */}
              {isExpanded && (
                <div className="border-border/50 relative mt-0.5 ml-5 space-y-0.5 border-l pl-3">
                  {group.children.map((child) => {
                    const isActive = activeSection === child.id;
                    return (
                      <Button
                        key={child.id}
                        variant="ghost"
                        onClick={() => onSectionChange(child.id)}
                        className={cn(
                          'flex h-auto w-full items-center px-3 py-1.5 text-left text-sm',
                          isActive
                            ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                            : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
                        )}
                      >
                        {t(`admin.settings.tree.${child.id}`, child.id)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
