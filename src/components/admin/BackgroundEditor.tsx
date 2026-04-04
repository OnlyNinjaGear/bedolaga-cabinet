import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandingApi } from '@/api/branding';
import { setCachedAnimationConfig } from '@/utils/backgroundConfig';
import type { AnimationConfig } from '@/components/ui/backgrounds/types';
import { DEFAULT_ANIMATION_CONFIG } from '@/components/ui/backgrounds/types';
import { BackgroundConfigEditor } from './BackgroundConfigEditor';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function BackgroundEditor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const { data: serverConfig } = useQuery({
    queryKey: ['animation-config'],
    queryFn: brandingApi.getAnimationConfig,
    staleTime: 30_000,
  });

  const [localConfig, setLocalConfig] = useState<AnimationConfig | null>(null);
  const config = localConfig ?? serverConfig ?? DEFAULT_ANIMATION_CONFIG;

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveMutation = useMutation({
    mutationFn: brandingApi.updateAnimationConfig,
    onMutate: () => setSaveStatus('saving'),
    onSuccess: (data) => {
      setCachedAnimationConfig(data);
      queryClient.setQueryData(['animation-config'], data);
      setLocalConfig(null);
      setSaveStatus('saved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => setSaveStatus('idle'),
  });

  const handleChange = useCallback((newConfig: AnimationConfig) => {
    setLocalConfig(newConfig);
  }, []);

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const isDirty = localConfig !== null;
  const showSaveButton = isDirty || saveStatus === 'saved' || saveStatus === 'saving';

  return (
    <div className="space-y-6">
      <BackgroundConfigEditor value={config} onChange={handleChange} />

      {/* Save button */}
      {showSaveButton && (
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || saveStatus === 'saved'}
          variant={saveStatus === 'saved' ? 'ghost' : 'default'}
          className={cn(
            'w-full',
            saveStatus === 'saved' && 'bg-success-500/20 text-success-400 hover:bg-success-500/20',
          )}
        >
          {saveStatus === 'saving'
            ? t('admin.backgrounds.saving')
            : saveStatus === 'saved'
              ? t('admin.backgrounds.saved')
              : t('admin.backgrounds.save')}
        </Button>
      )}
    </div>
  );
}
