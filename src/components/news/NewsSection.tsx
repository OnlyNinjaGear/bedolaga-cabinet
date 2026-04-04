import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { newsApi } from '../../api/news';
import { useHapticFeedback } from '../../platform/hooks/useHaptic';
import { cn } from '../../lib/utils';
import type { NewsListItem } from '../../types/news';
import { Button } from '@/components/ui/button';

// --- Security: hex color validation to prevent CSS injection ---
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function safeColor(color: string | null | undefined, fallback = '#888888'): string {
  if (!color || !HEX_COLOR_RE.test(color)) return fallback;
  return color;
}

// --- Animation variants ---
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: EASE_OUT,
    },
  }),
};

// --- Icons ---
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// --- Sub-components ---

interface CategoryBadgeProps {
  category: string;
  color: string;
  className?: string;
}

const CategoryBadge = memo(function CategoryBadge({
  category,
  color,
  className,
}: CategoryBadgeProps) {
  const c = safeColor(color);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[11px] font-bold tracking-widest uppercase',
        className,
      )}
      style={{
        color: c,
        background: `${c}15`,
        border: `1px solid ${c}30`,
      }}
    >
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full"
        style={{
          background: c,
          boxShadow: `0 0 8px ${c}`,
        }}
      />
      {category}
    </span>
  );
});

interface TagBadgeProps {
  text: string;
  color: string;
}

const TagBadge = memo(function TagBadge({ text, color }: TagBadgeProps) {
  const c = safeColor(color);
  return (
    <span
      className="inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase"
      style={{
        color: c,
        border: `1px solid ${c}33`,
        background: `${c}11`,
      }}
    >
      {text}
    </span>
  );
});

interface FilterTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

const FilterTabs = memo(function FilterTabs({ categories, active, onChange }: FilterTabsProps) {
  const { t } = useTranslation();
  const haptic = useHapticFeedback();

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('news.title')}>
      {/* "All" tab — empty string means no filter */}
      <Button
        role="tab"
        aria-selected={active === ''}
        variant="ghost"
        onClick={() => {
          haptic.selectionChanged();
          onChange('');
        }}
        className={cn(
          'h-auto min-h-11 rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide',
          active === ''
            ? 'border-primary/70 bg-primary/80 text-foreground hover:bg-primary/80 hover:text-foreground border'
            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary border',
        )}
      >
        {t('news.filterAll')}
      </Button>
      {categories.map((cat) => {
        const isActive = active === cat;
        return (
          <Button
            key={cat}
            role="tab"
            aria-selected={isActive}
            variant="ghost"
            onClick={() => {
              haptic.selectionChanged();
              onChange(cat);
            }}
            className={cn(
              'h-auto min-h-11 rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide',
              isActive
                ? 'border-primary/70 bg-primary/80 text-foreground hover:bg-primary/80 hover:text-foreground border'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary border',
            )}
          >
            {cat}
          </Button>
        );
      })}
    </div>
  );
});

interface FeaturedCardProps {
  item: NewsListItem;
  onClick: () => void;
}

const FeaturedCard = memo(function FeaturedCard({ item, onClick }: FeaturedCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <motion.article
      custom={0}
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group focus-visible:ring-ring/70 focus-visible:ring-offset-background col-span-full cursor-pointer rounded-2xl p-px transition-all duration-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, transparent), color-mix(in srgb, var(--background) 20%, transparent), color-mix(in srgb, var(--primary) 20%, transparent))',
      }}
      whileHover={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--primary) 40%, transparent), color-mix(in srgb, var(--primary) 40%, transparent), color-mix(in srgb, var(--primary) 40%, transparent))',
      }}
      onClick={onClick}
    >
      <div className="bg-background relative flex min-h-55 flex-col justify-between overflow-hidden rounded-[15px] p-7 sm:p-10">
        {/* Corner decoration */}
        <div
          className="pointer-events-none absolute top-0 right-0 h-50 w-50"
          style={{
            background:
              'radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 8%, transparent), transparent 70%)',
          }}
        />

        {/* Shimmer top border */}
        <div
          className="absolute -top-px right-[20%] left-[20%] h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 40%, transparent), transparent)',
            animation: 'newsShimmer 3s ease-in-out infinite',
          }}
        />

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <CategoryBadge category={item.category} color={item.category_color} />
            {item.tag && <TagBadge text={item.tag} color={item.category_color} />}
            <span className="text-muted-foreground ml-auto font-mono text-[11px]">
              {item.read_time_minutes} {t('news.readTime')}
            </span>
          </div>

          <h2 className="text-foreground group-hover:text-primary-foreground mb-3 max-w-175 text-2xl leading-tight font-extrabold break-words transition-colors duration-300 sm:text-[28px]">
            {item.title}
          </h2>

          {item.excerpt && (
            <p className="text-muted-foreground max-w-150 text-[15px] leading-relaxed">
              {item.excerpt}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-muted-foreground font-mono text-xs">
            {item.published_at ? new Date(item.published_at).toLocaleDateString(i18n.language) : ''}
          </span>
          <span className="text-primary inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2.5">
            {t('news.readMore')}
            <ArrowIcon />
          </span>
        </div>
      </div>
    </motion.article>
  );
});

interface NewsCardProps {
  item: NewsListItem;
  index: number;
  onClick: () => void;
}

const NewsCard = memo(function NewsCard({ item, index, onClick }: NewsCardProps) {
  const { t, i18n } = useTranslation();
  const color = safeColor(item.category_color);

  return (
    <motion.article
      custom={index + 1}
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group focus-visible:ring-ring/70 focus-visible:ring-offset-background cursor-pointer rounded-[14px] p-px transition-all duration-[450ms] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      style={{
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--muted) 25%, transparent), color-mix(in srgb, var(--background) 25%, transparent))',
      }}
      whileHover={{
        y: -4,
        background: `linear-gradient(160deg, ${color}55, transparent 60%)`,
      }}
      onClick={onClick}
    >
      <div className="bg-background relative flex h-full min-h-52.5 flex-col justify-between overflow-hidden rounded-[13px] p-7">
        {/* Subtle corner glow on hover */}
        <div
          className="pointer-events-none absolute -right-5 -bottom-5 h-25 w-25 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle, ${color}08, transparent 70%)`,
          }}
        />

        <div>
          <div className="mb-3.5 flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase"
              style={{ color }}
            >
              <span
                className="h-1.25 w-1.25 rounded-full"
                style={{
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                }}
              />
              {item.category}
            </span>
            {item.tag && <TagBadge text={item.tag} color={color} />}
          </div>

          <h3 className="text-foreground group-hover:text-primary-foreground mb-2.5 text-[17px] leading-snug font-bold break-words transition-colors duration-300">
            {item.title}
          </h3>

          {item.excerpt && (
            <p className="text-muted-foreground text-[13px] leading-relaxed">{item.excerpt}</p>
          )}
        </div>

        <div className="border-border/50 mt-5 flex items-center justify-between border-t pt-3.5">
          <span className="text-muted-foreground font-mono text-[11px]">
            {item.published_at ? new Date(item.published_at).toLocaleDateString(i18n.language) : ''}
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {item.read_time_minutes} {t('news.readTime')}
          </span>
        </div>
      </div>
    </motion.article>
  );
});

// Thin wrapper that binds the per-item click handler without creating a new
// anonymous lambda in the parent's JSX on every render, which would defeat
// the memo on NewsCard.
interface NewsCardWrapperProps {
  item: NewsListItem;
  index: number;
  onCardClick: (slug: string) => void;
}

const NewsCardWrapper = memo(function NewsCardWrapper({
  item,
  index,
  onCardClick,
}: NewsCardWrapperProps) {
  const handleClick = useCallback(() => onCardClick(item.slug), [item.slug, onCardClick]);
  return <NewsCard item={item} index={index} onClick={handleClick} />;
});

// --- Main Component ---

const NEWS_LIMIT = 6;

export default function NewsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const haptic = useHapticFeedback();
  const [filter, setFilter] = useState<string>('');
  const [limit, setLimit] = useState(NEWS_LIMIT);

  const categoryParam = filter || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['news', 'list', categoryParam, limit],
    queryFn: () => newsApi.getNews({ category: categoryParam, limit, offset: 0 }),
    // staleTime: serve cached data for 2 min before background re-fetch.
    // gcTime: keep in cache for 10 min so navigating away and back is instant.
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const categories = data?.categories ?? [];

  // Memoized so FeaturedCard/NewsCard receive stable object references when
  // parent state unrelated to the list changes (e.g. load-more button state).
  const { featured, regular } = useMemo(
    () => ({
      featured: items.find((n) => n.is_featured),
      regular: items.filter((n) => !n.is_featured),
    }),
    [items],
  );

  const handleCardClick = useCallback(
    (slug: string) => {
      haptic.buttonPress();
      navigate(`/news/${slug}`);
    },
    [haptic, navigate],
  );

  const handleLoadMore = useCallback(() => {
    haptic.buttonPress();
    setLimit((prev) => prev + NEWS_LIMIT);
  }, [haptic]);

  const handleFilterChange = useCallback((category: string) => {
    setFilter(category);
    setLimit(NEWS_LIMIT);
  }, []);

  // Stable reference for the featured card — avoids re-rendering FeaturedCard
  // when `featured` is a new object reference but contains the same slug.
  const featuredSlug = featured?.slug;
  const handleFeaturedClick = useCallback(() => {
    if (featuredSlug) handleCardClick(featuredSlug);
  }, [featuredSlug, handleCardClick]);

  // Don't render until we know there are news items.
  // This prevents the skeleton from briefly flashing when there are no articles.
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-card/80 relative overflow-hidden rounded-2xl backdrop-blur-xl">
      <div className="px-5 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <motion.div
          variants={fadeSlideUp}
          custom={0}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="mb-2 flex items-center gap-2.5">
            <div className="from-primary/80 to-primary/80 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                  fill="currentColor"
                  className="text-foreground/20"
                />
                <path
                  d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-foreground"
                />
                <path
                  d="M7 8h4M7 11h10M7 14h10M7 17h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-foreground"
                />
                <rect
                  x="14"
                  y="7"
                  width="4"
                  height="4"
                  rx="0.5"
                  fill="currentColor"
                  className="text-foreground"
                />
              </svg>
            </div>
            <span className="text-muted-foreground font-mono text-[11px] font-bold tracking-[0.18em] uppercase">
              {t('news.title')}
            </span>
          </div>

          {categories.length > 0 && (
            <FilterTabs categories={categories} active={filter} onChange={handleFilterChange} />
          )}
        </motion.div>

        {/* Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featured && <FeaturedCard item={featured} onClick={handleFeaturedClick} />}
            {regular.map((item, i) => (
              <NewsCardWrapper key={item.id} item={item} index={i} onCardClick={handleCardClick} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!isLoading && items.length < total && (
          <motion.div
            variants={fadeSlideUp}
            custom={6}
            initial="hidden"
            animate="visible"
            className="mt-10 text-center"
          >
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="text-muted-foreground hover:border-primary/30 hover:text-primary min-h-11 rounded-xl px-8 py-3 text-[13px] font-semibold tracking-wide"
            >
              {t('news.loadMore')}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
