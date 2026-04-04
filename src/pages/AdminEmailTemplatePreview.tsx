import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminEmailTemplatesApi } from '../api/adminEmailTemplates';
import { BackIcon } from '../components/admin';
import { Button } from '@/components/ui/button';

interface PreviewState {
  subject: string;
  body_html: string;
}

export default function AdminEmailTemplatePreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { type, lang } = useParams<{ type: string; lang: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [previewHtml, setPreviewHtml] = useState<string>('');

  // Get data from navigation state
  const state = location.state as PreviewState | null;

  // Preview mutation
  const {
    mutate: loadPreview,
    isPending: previewPending,
    isError: previewError,
  } = useMutation({
    mutationFn: () => {
      if (!type || !lang || !state) {
        throw new Error('Missing required data');
      }
      return adminEmailTemplatesApi.previewTemplate(type, {
        language: lang,
        subject: state.subject,
        body_html: state.body_html,
      });
    },
    onSuccess: (data) => {
      setPreviewHtml(data.body_html);
    },
  });

  // Load preview on mount
  useEffect(() => {
    if (!type || !lang || !state) {
      navigate('/admin/email-templates');
      return;
    }
    loadPreview();
  }, [type, lang, state, navigate, loadPreview]);

  // Write preview HTML into iframe
  useEffect(() => {
    if (previewHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  if (!type || !lang || !state) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <BackIcon />
        </Button>
        <div>
          <h1 className="text-foreground text-xl font-bold">{t('admin.emailTemplates.preview')}</h1>
          <p className="text-muted-foreground text-sm">
            {type} / {lang.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Preview content */}
      <div className="border-border flex-1 overflow-hidden rounded-xl border bg-white">
        {previewPending ? (
          <div className="bg-card flex h-full items-center justify-center">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : previewError ? (
          <div className="bg-card flex h-full flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">{t('common.error')}</p>
            <Button onClick={() => navigate(-1)}>{t('common.back')}</Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            sandbox="allow-same-origin"
            title="Email Preview"
          />
        )}
      </div>
    </div>
  );
}
