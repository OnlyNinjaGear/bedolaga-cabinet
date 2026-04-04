import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { infoApi, type LanguageInfo } from '@/api/info';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const data = await infoApi.getLanguages();
        setAvailableLanguages(data.languages);
      } catch {
        // Silently fall back to empty list — component handles it gracefully
      }
    };
    fetchLanguages();
  }, []);

  const currentLang = availableLanguages.find((l) => l.code === i18n.language) ||
    availableLanguages[0] || { code: 'ru', name: 'RU', flag: '🇷🇺' };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = code === 'fa' ? 'rtl' : 'ltr';
    setIsOpen(false);
  };

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'fa' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  if (availableLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-auto gap-1.5 rounded-xl border px-2.5 py-2 text-sm',
          isOpen
            ? 'border-border bg-muted hover:bg-muted'
            : 'border-border/50 bg-card/50 hover:border-border hover:bg-muted',
        )}
        aria-label="Change language"
      >
        <span>{currentLang.flag}</span>
        <span className="text-foreground font-medium">{currentLang.code.toUpperCase()}</span>
        <svg
          className={`text-muted-foreground h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <div className="animate-fade-in border-border/50 bg-card absolute right-0 z-50 mt-2 w-40 rounded-xl border py-1 shadow-lg">
          {availableLanguages.map((lang) => (
            <Button
              key={lang.code}
              variant="ghost"
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                'h-auto w-full justify-start gap-3 px-4 py-2.5 text-sm',
                lang.code === i18n.language
                  ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
