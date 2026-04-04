import { cn } from '@/lib/utils';
import { safeBoolean } from './types';
import { useAnimationPause } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

export default function AuroraBackground({ settings }: Props) {
  const showRadialGradient = safeBoolean(settings.showRadialGradient, true);
  const paused = useAnimationPause();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={cn(
          'pointer-events-none absolute -inset-2.5 opacity-50',
          !isMobile && 'animate-aurora',
          showRadialGradient &&
            '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]',
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(100deg, var(--background) 0%, var(--background) 7%, transparent 10%, transparent 12%, var(--background) 16%), repeating-linear-gradient(100deg, var(--primary) 10%, #a5b4fc 15%, #93c5fd 20%, #ddd6fe 25%, #60a5fa 30%)',
          backgroundSize: isMobile ? '100%, 100%' : '300%, 200%',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  );
}
