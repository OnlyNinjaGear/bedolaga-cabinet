import { useNavigate } from 'react-router';
import { SeoTab } from '../components/admin/SeoTab';
import { Button } from '@/components/ui/button';

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

export default function AdminSEO() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-16 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/settings')}
          aria-label="Назад"
        >
          <BackIcon />
        </Button>
        <div>
          <h1 className="text-foreground text-xl font-semibold">SEO / Open Graph</h1>
          <p className="text-muted-foreground text-sm">
            Мета-теги, превью при репосте и настройки индексации
          </p>
        </div>
      </div>

      {/* SEO Tab content */}
      <SeoTab />
    </div>
  );
}
