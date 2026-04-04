import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

// Navigation links
const ADMIN_LINKS = [
  { label: 'Главная', path: '/admin', icon: '🏠', group: 'Навигация' },
  { label: 'Пользователи', path: '/admin/users', icon: '👥', group: 'Навигация' },
  { label: 'Платежи', path: '/admin/payments', icon: '💰', group: 'Навигация' },
  { label: 'Тикеты', path: '/admin/tickets', icon: '🎫', group: 'Навигация' },
  { label: 'Рассылки', path: '/admin/broadcasts', icon: '📢', group: 'Навигация' },
  { label: 'Промокоды', path: '/admin/promocodes', icon: '🏷️', group: 'Навигация' },
  { label: 'Тарифы', path: '/admin/tariffs', icon: '📋', group: 'Навигация' },
  { label: 'Серверы', path: '/admin/servers', icon: '🖥️', group: 'Навигация' },
  { label: 'Статистика', path: '/admin/dashboard', icon: '📊', group: 'Навигация' },
  { label: 'Настройки', path: '/admin/settings', icon: '⚙️', group: 'Навигация' },
  { label: 'Аналитика', path: '/admin/sales-stats', icon: '📈', group: 'Навигация' },
  { label: 'Партнёры', path: '/admin/partners', icon: '🤝', group: 'Навигация' },
  { label: 'Лендинги', path: '/admin/landings', icon: '🌐', group: 'Навигация' },
  { label: 'Новости', path: '/admin/news', icon: '📰', group: 'Навигация' },
  { label: 'Выводы средств', path: '/admin/withdrawals', icon: '💸', group: 'Навигация' },
  { label: 'SEO / Open Graph', path: '/admin/seo', icon: '🔍', group: 'Настройки' },
  { label: 'Аналитика счётчики', path: '/admin/settings', icon: '📡', group: 'Настройки' },
  { label: 'Аудит', path: '/admin/audit-log', icon: '📜', group: 'Система' },
  { label: 'Уведомления', path: '/admin/notifications', icon: '🔔', group: 'Система' },
  { label: 'Здоровье системы', path: '/admin/health', icon: '💚', group: 'Система' },
  { label: 'Роли и права', path: '/admin/roles', icon: '🔐', group: 'Система' },
  { label: 'Правила и политики', path: '/admin/policies', icon: '📃', group: 'Система' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const runCommand = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Поиск по разделам... (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        {['Навигация', 'Настройки', 'Система'].map((group) => (
          <CommandGroup key={group} heading={group}>
            {ADMIN_LINKS.filter((l) => l.group === group).map((link) => (
              <CommandItem
                key={link.path}
                value={link.label}
                onSelect={() => runCommand(link.path)}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  );
}
