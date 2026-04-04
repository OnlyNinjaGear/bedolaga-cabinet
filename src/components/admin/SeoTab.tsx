import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandingApi, type SeoConfig, DEFAULT_SEO_CONFIG } from '../../api/branding';
import { CheckIcon } from './icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Apply SEO meta tags to document <head>
function applySeoToHead(config: SeoConfig) {
  const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.content = content;
  };

  const removeMeta = (name: string, attr: 'name' | 'property' = 'name') => {
    const el = document.querySelector(`meta[${attr}="${name}"]`);
    if (el) el.remove();
  };

  if (config.site_title) document.title = config.site_title;

  if (config.site_description) setMeta('description', config.site_description);
  else removeMeta('description');

  if (config.robots) setMeta('robots', config.robots);

  // OpenGraph
  if (config.og_title) setMeta('og:title', config.og_title, 'property');
  else removeMeta('og:title', 'property');

  if (config.og_description) setMeta('og:description', config.og_description, 'property');
  else removeMeta('og:description', 'property');

  if (config.og_image_url) setMeta('og:image', config.og_image_url, 'property');
  else removeMeta('og:image', 'property');

  if (config.og_site_name) setMeta('og:site_name', config.og_site_name, 'property');
  else removeMeta('og:site_name', 'property');

  setMeta('og:type', 'website', 'property');

  // Twitter
  setMeta('twitter:card', config.twitter_card);
  if (config.og_title) setMeta('twitter:title', config.og_title);
  if (config.og_description) setMeta('twitter:description', config.og_description);
  if (config.og_image_url) setMeta('twitter:image', config.og_image_url);

  // Canonical
  if (config.canonical_url) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = config.canonical_url;
  }
}

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
}

function Field({ label, hint, value, onChange, placeholder, multiline, mono }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-foreground block text-sm font-medium">{label}</label>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cn('resize-none', mono && 'font-mono text-xs')}
        />
      ) : (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(mono && 'font-mono text-xs')}
        />
      )}
    </div>
  );
}

export function SeoTab() {
  const queryClient = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ['seo-config'],
    queryFn: brandingApi.getSeoConfig,
  });

  const [form, setForm] = useState<SeoConfig>(DEFAULT_SEO_CONFIG);
  const [savedBanner, setSavedBanner] = useState(false);

  // Sync form when data arrives
  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  const updateMutation = useMutation({
    mutationFn: brandingApi.updateSeoConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(['seo-config'], data);
      applySeoToHead(data);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const set = (key: keyof SeoConfig) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const handleSave = () => updateMutation.mutate(form);

  const ogPreviewTitle = form.og_title || form.site_title || 'Заголовок страницы';
  const ogPreviewDesc = form.og_description || form.site_description || 'Описание сайта';
  const ogPreviewImg = form.og_image_url;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-foreground text-base font-semibold">SEO / Open Graph</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Мета-теги применяются к документу динамически. Для индексации поисковиками настройте
          серверный рендеринг.
        </p>
      </div>

      {/* Basic SEO */}
      <section className="space-y-4">
        <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
          Основное
        </h4>
        <Field
          label="Заголовок сайта (title)"
          hint="Отображается во вкладке браузера и поисковых результатах"
          value={form.site_title}
          onChange={set('site_title')}
          placeholder="Мой VPN-сервис"
        />
        <Field
          label="Описание (meta description)"
          hint="150–160 символов для поисковых сниппетов"
          value={form.site_description}
          onChange={set('site_description')}
          placeholder="Быстрый и безопасный VPN"
          multiline
        />
        <Field
          label="Robots"
          hint="Директивы для поисковых роботов"
          value={form.robots}
          onChange={set('robots')}
          placeholder="noindex, nofollow"
          mono
        />
        <Field
          label="Canonical URL"
          hint="Канонический адрес сайта (без трейлинг-слэша)"
          value={form.canonical_url}
          onChange={set('canonical_url')}
          placeholder="https://mysite.com"
          mono
        />
      </section>

      {/* Open Graph */}
      <section className="space-y-4">
        <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
          Open Graph (превью при репосте)
        </h4>
        <Field
          label="OG заголовок"
          hint="По умолчанию — заголовок сайта"
          value={form.og_title}
          onChange={set('og_title')}
          placeholder={form.site_title || 'Заголовок'}
        />
        <Field
          label="OG описание"
          value={form.og_description}
          onChange={set('og_description')}
          placeholder={form.site_description || 'Описание'}
          multiline
        />
        <Field
          label="OG изображение (URL)"
          hint="1200×630 px. Откройте доступ по прямой ссылке"
          value={form.og_image_url}
          onChange={set('og_image_url')}
          placeholder="https://cdn.example.com/og.png"
          mono
        />
        <Field
          label="Название сайта (og:site_name)"
          value={form.og_site_name}
          onChange={set('og_site_name')}
          placeholder="My VPN"
        />

        {/* Twitter card type */}
        <div className="space-y-1.5">
          <label className="text-foreground block text-sm font-medium">Twitter Card Type</label>
          <div className="flex gap-3">
            {(['summary', 'summary_large_image'] as const).map((type) => (
              <Button
                key={type}
                variant={form.twitter_card === type ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setForm((f) => ({ ...f, twitter_card: type }))}
                className={cn(
                  'font-mono text-xs',
                  form.twitter_card === type && 'border-primary bg-primary/10 text-primary',
                )}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* OG Preview */}
      <section className="space-y-3">
        <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
          Превью (приблизительно)
        </h4>
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          {ogPreviewImg ? (
            <img
              src={ogPreviewImg}
              alt="OG preview"
              className="h-48 w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="bg-muted/30 text-muted-foreground/40 flex h-32 items-center justify-center text-sm">
              Нет изображения
            </div>
          )}
          <div className="p-4">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              {form.og_site_name || 'Название сайта'}
            </p>
            <p className="text-foreground mt-1 line-clamp-2 text-sm font-semibold">
              {ogPreviewTitle}
            </p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{ogPreviewDesc}</p>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Проверить реальный превью:{' '}
          <a
            href="https://developers.facebook.com/tools/debug/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Facebook Debugger
          </a>
          {', '}
          <a
            href="https://cards-dev.twitter.com/validator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Twitter Validator
          </a>
        </p>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          variant={savedBanner ? 'secondary' : 'default'}
          className={cn(savedBanner && 'text-green-600 dark:text-green-400')}
        >
          {updateMutation.isPending ? (
            'Сохраняем...'
          ) : savedBanner ? (
            <span className="flex items-center gap-1.5">
              <CheckIcon />
              Сохранено
            </span>
          ) : (
            'Сохранить'
          )}
        </Button>
        {updateMutation.isError && (
          <p className="text-destructive text-sm">
            Ошибка. Проверьте, что бэкенд поддерживает /cabinet/branding/seo
          </p>
        )}
      </div>
    </div>
  );
}
