import { useTranslation } from 'react-i18next';
import { useRef, useEffect, useState } from 'react';
import { SETTINGS_TREE } from './constants';
import { StarIcon } from './icons';
import { Button } from '@/components/ui/button';

interface SettingsMobileTabsProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  favoritesCount: number;
}

export function SettingsMobileTabs({
  activeSection,
  setActiveSection,
  favoritesCount,
}: SettingsMobileTabsProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeEl = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSection]);

  // Auto-expand the group containing the active section
  useEffect(() => {
    for (const group of SETTINGS_TREE.groups) {
      if (group.children.some((child) => child.id === activeSection)) {
        setExpandedGroup(group.id);
        return;
      }
    }
  }, [activeSection]);

  const handleGroupTap = (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      // Auto-select first child when expanding
      const group = SETTINGS_TREE.groups.find((g) => g.id === groupId);
      if (group && group.children.length > 0) {
        setActiveSection(group.children[0].id);
      }
    }
  };

  const isGroupActive = (groupId: string) => {
    const group = SETTINGS_TREE.groups.find((g) => g.id === groupId);
    return group?.children.some((child) => child.id === activeSection) ?? false;
  };

  const isFavoritesActive = activeSection === 'favorites';

  // Check if active section is a special item
  const isSpecialActive = (itemId: string) => activeSection === itemId;

  // Special items excluding favorites
  const specialItems = SETTINGS_TREE.specialItems.filter((item) => item.id !== 'favorites');

  return (
    <div>
      {/* Level 1: Favorites + special items + group chips */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-2 overflow-x-auto px-3 py-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Favorites chip */}
        <Button
          ref={isFavoritesActive ? activeRef : null}
          variant="ghost"
          onClick={() => {
            setActiveSection('favorites');
            setExpandedGroup(null);
          }}
          className={`flex h-auto shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            isFavoritesActive
              ? 'bg-primary/15 text-primary ring-ring/30 hover:bg-primary/15 hover:text-primary ring-1'
              : 'bg-card/50 text-muted-foreground'
          }`}
        >
          <StarIcon filled={isFavoritesActive} />
          <span className="whitespace-nowrap">{t('admin.settings.favorites')}</span>
          {favoritesCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                isFavoritesActive
                  ? 'bg-primary/20 text-primary'
                  : 'bg-warning-500/20 text-warning-400'
              }`}
            >
              {favoritesCount}
            </span>
          )}
        </Button>

        {/* Special item chips (branding, theme, analytics, buttons) */}
        {specialItems.map((item) => {
          const isActive = isSpecialActive(item.id);
          return (
            <Button
              key={item.id}
              ref={isActive ? activeRef : null}
              variant="ghost"
              onClick={() => {
                setActiveSection(item.id);
                setExpandedGroup(null);
              }}
              className={`flex h-auto shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                isActive
                  ? 'bg-primary/15 text-primary ring-ring/30 hover:bg-primary/15 hover:text-primary ring-1'
                  : 'bg-card/50 text-muted-foreground'
              }`}
            >
              {item.icon && <span className="text-sm">{item.icon}</span>}
              <span className="whitespace-nowrap">{t(`admin.settings.${item.id}`)}</span>
            </Button>
          );
        })}

        {/* Group chips */}
        {SETTINGS_TREE.groups.map((group) => {
          const hasActiveChild = isGroupActive(group.id);
          const isExpanded = expandedGroup === group.id;
          return (
            <Button
              key={group.id}
              ref={hasActiveChild ? activeRef : null}
              variant="ghost"
              onClick={() => handleGroupTap(group.id)}
              className={`flex h-auto shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                hasActiveChild || isExpanded
                  ? 'bg-primary/15 text-primary ring-ring/30 hover:bg-primary/15 hover:text-primary ring-1'
                  : 'bg-card/50 text-muted-foreground'
              }`}
            >
              <span className="text-sm">{group.icon}</span>
              <span className="whitespace-nowrap">{t(`admin.settings.groups.${group.id}`)}</span>
            </Button>
          );
        })}
        <div className="w-3 shrink-0" aria-hidden="true" />
      </div>

      {/* Level 2: Sub-item chips (shown when a group is expanded) */}
      {expandedGroup && (
        <div
          className="scrollbar-hide flex gap-2 overflow-x-auto px-3 pb-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {SETTINGS_TREE.groups
            .find((g) => g.id === expandedGroup)
            ?.children.map((child) => {
              const isActive = activeSection === child.id;
              return (
                <Button
                  key={child.id}
                  variant="ghost"
                  onClick={() => setActiveSection(child.id)}
                  className={`h-auto shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-primary/10 text-primary ring-ring/20 hover:bg-primary/10 hover:text-primary ring-1'
                      : 'bg-card/30 text-muted-foreground'
                  }`}
                >
                  <span className="whitespace-nowrap">{t(`admin.settings.tree.${child.id}`)}</span>
                </Button>
              );
            })}
          <div className="w-3 shrink-0" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
