import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminPinnedMessagesApi,
  PinnedMessageCreateRequest,
  PinnedMessageUpdateRequest,
} from '../api/adminPinnedMessages';
import { AdminBackButton, Toggle } from '../components/admin';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Icons
const PinIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const PhotoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function AdminPinnedMessageCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(id);
  const messageId = id ? parseInt(id, 10) : null;

  // Form state
  const [content, setContent] = useState('');
  const [sendBeforeMenu, setSendBeforeMenu] = useState(true);
  const [sendOnEveryStart, setSendOnEveryStart] = useState(true);
  const [broadcastOnCreate, setBroadcastOnCreate] = useState(false);

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingMediaType, setExistingMediaType] = useState<'photo' | 'video' | null>(null);
  const mediaPreviewRef = useRef<string | null>(null);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
    };
  }, []);

  // Load existing message for editing
  const { data: existingMessage, isLoading: isLoadingMessage } = useQuery({
    queryKey: ['admin', 'pinned-messages', 'detail', messageId],
    queryFn: () => adminPinnedMessagesApi.get(messageId!),
    enabled: isEditing && messageId !== null,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (existingMessage) {
      setContent(existingMessage.content || '');
      setSendBeforeMenu(existingMessage.send_before_menu);
      setSendOnEveryStart(existingMessage.send_on_every_start);
      if (existingMessage.media_file_id && existingMessage.media_type) {
        setUploadedFileId(existingMessage.media_file_id);
        setExistingMediaType(existingMessage.media_type);
        setMediaType(existingMessage.media_type);
      }
    }
  }, [existingMessage]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: PinnedMessageCreateRequest) => adminPinnedMessagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
      navigate('/admin/pinned-messages');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: PinnedMessageUpdateRequest) =>
      adminPinnedMessagesApi.update(messageId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
      navigate('/admin/pinned-messages');
    },
  });

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setExistingMediaType(null);

    let detectedType: 'photo' | 'video' = 'photo';
    if (file.type.startsWith('image/')) {
      detectedType = 'photo';
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
      const url = URL.createObjectURL(file);
      mediaPreviewRef.current = url;
      setMediaPreview(url);
    } else if (file.type.startsWith('video/')) {
      detectedType = 'video';
      setMediaPreview(null);
    }
    setMediaType(detectedType);

    setIsUploading(true);
    try {
      const result = await adminPinnedMessagesApi.uploadMedia(file, detectedType);
      setUploadedFileId(result.file_id);
    } catch {
      setMediaFile(null);
      setMediaPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove media
  const handleRemoveMedia = () => {
    if (mediaPreviewRef.current) {
      URL.revokeObjectURL(mediaPreviewRef.current);
      mediaPreviewRef.current = null;
    }
    setMediaFile(null);
    setMediaPreview(null);
    setUploadedFileId(null);
    setExistingMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate
  const isValid = content.trim().length > 0 || uploadedFileId !== null;

  // Submit
  const handleSubmit = () => {
    if (!isValid) return;

    if (isEditing && messageId !== null) {
      const data: PinnedMessageUpdateRequest = {
        content,
        send_before_menu: sendBeforeMenu,
        send_on_every_start: sendOnEveryStart,
      };
      if (uploadedFileId) {
        data.media = { type: mediaType, file_id: uploadedFileId };
      }
      updateMutation.mutate(data);
    } else {
      const data: PinnedMessageCreateRequest = {
        content,
        send_before_menu: sendBeforeMenu,
        send_on_every_start: sendOnEveryStart,
        broadcast: broadcastOnCreate,
      };
      if (uploadedFileId) {
        data.media = { type: mediaType, file_id: uploadedFileId };
      }
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingMessage) {
    return (
      <div className="border-border bg-card/50 text-muted-foreground rounded-xl border p-8 text-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/pinned-messages" />
        <div className="flex items-center gap-3">
          <div className="bg-error-500/20 text-error-400 rounded-lg p-2">
            <PinIcon />
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold">
              {isEditing ? t('admin.pinnedMessages.editMessage') : t('admin.pinnedMessages.create')}
            </h1>
            <p className="text-muted-foreground text-sm">{t('admin.pinnedMessages.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card className="space-y-6">
        {/* Message text */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.pinnedMessages.content')}
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('admin.pinnedMessages.contentPlaceholder')}
            rows={6}
            maxLength={4000}
            className="min-h-37.5 resize-y"
          />
          <div className="text-muted-foreground mt-1 text-right text-xs">{content.length}/4000</div>
        </div>

        {/* Media upload */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm font-medium">
            {t('admin.pinnedMessages.media')}
          </label>
          {mediaFile || existingMediaType ? (
            <div className="border-border bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(mediaType === 'photo' || existingMediaType === 'photo') && <PhotoIcon />}
                  {(mediaType === 'video' || existingMediaType === 'video') && <VideoIcon />}
                  <div>
                    <p className="text-foreground text-sm">
                      {mediaFile
                        ? mediaFile.name
                        : `${existingMediaType} (${t('admin.pinnedMessages.media')})`}
                    </p>
                    {mediaFile && (
                      <p className="text-muted-foreground text-xs">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveMedia}
                  className="text-muted-foreground hover:text-error-400"
                  disabled={isUploading}
                >
                  <XIcon />
                </Button>
              </div>
              {mediaPreview && (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="mt-3 max-h-48 rounded-lg object-cover"
                />
              )}
              {isUploading && (
                <div className="text-primary mt-2 flex items-center gap-2 text-sm">
                  <RefreshIcon />
                  {t('admin.pinnedMessages.uploading')}
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-muted-foreground flex h-auto w-full items-center justify-center gap-2 rounded-lg border-dashed p-6"
              >
                <PhotoIcon />
                <span>{t('admin.pinnedMessages.addMedia')}</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Settings */}
      <Card className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold">
          {t('admin.pinnedMessages.settings')}
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-foreground text-sm font-medium">
              {t('admin.pinnedMessages.sendBeforeMenu')}
            </p>
          </div>
          <Toggle checked={sendBeforeMenu} onChange={() => setSendBeforeMenu((p) => !p)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-foreground text-sm font-medium">
              {t('admin.pinnedMessages.sendOnEveryStart')}
            </p>
          </div>
          <Toggle checked={sendOnEveryStart} onChange={() => setSendOnEveryStart((p) => !p)} />
        </div>

        {!isEditing && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">
                {t('admin.pinnedMessages.broadcastOnCreate')}
              </p>
            </div>
            <Toggle checked={broadcastOnCreate} onChange={() => setBroadcastOnCreate((p) => !p)} />
          </div>
        )}
      </Card>

      {/* Footer */}
      <Card className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate('/admin/pinned-messages')}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isPending || isUploading}
          className="flex items-center gap-2"
        >
          {isPending ? <RefreshIcon /> : <SaveIcon />}
          {isEditing ? t('common.save') : t('admin.pinnedMessages.create')}
        </Button>
      </Card>
    </div>
  );
}
