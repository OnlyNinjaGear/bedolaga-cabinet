import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminBroadcastsApi,
  BroadcastFilter,
  TariffFilter,
  CombinedBroadcastCreateRequest,
  CustomBroadcastButton,
} from '../api/adminBroadcasts';
import { AdminBackButton } from '../components/admin';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Icons
const BroadcastIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
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

const DocumentIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

// Filter labels
const FILTER_GROUP_LABEL_KEYS: Record<string, string> = {
  basic: 'admin.broadcasts.filterGroups.basic',
  subscription: 'admin.broadcasts.filterGroups.subscription',
  traffic: 'admin.broadcasts.filterGroups.traffic',
  registration: 'admin.broadcasts.filterGroups.registration',
  activity: 'admin.broadcasts.filterGroups.activity',
  source: 'admin.broadcasts.filterGroups.source',
  tariff: 'admin.broadcasts.filterGroups.tariff',
  email: 'admin.broadcasts.filterGroups.email',
};

export default function AdminBroadcastCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Channel toggles (both can be enabled)
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // Separate targets per channel
  const [telegramTarget, setTelegramTarget] = useState('');
  const [emailTarget, setEmailTarget] = useState('');
  const [showTelegramFilters, setShowTelegramFilters] = useState(false);
  const [showEmailFilters, setShowEmailFilters] = useState(false);

  // Telegram-specific state
  const [messageText, setMessageText] = useState('');
  const [selectedButtons, setSelectedButtons] = useState<string[]>(['home']);
  const [customButtons, setCustomButtons] = useState<CustomBroadcastButton[]>([]);
  const [isAddingCustomButton, setIsAddingCustomButton] = useState(false);
  const [newButtonLabel, setNewButtonLabel] = useState('');
  const [newButtonActionType, setNewButtonActionType] = useState<'callback' | 'url'>('callback');
  const [newButtonActionValue, setNewButtonActionValue] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'document'>('photo');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaPreviewRef = useRef<string | null>(null);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
    };
  }, []);

  // Email-specific state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');

  // Submitting state for dual send
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Telegram filters
  const { data: filtersData, isLoading: filtersLoading } = useQuery({
    queryKey: ['admin', 'broadcasts', 'filters'],
    queryFn: adminBroadcastsApi.getFilters,
    enabled: telegramEnabled,
  });

  // Fetch Email filters
  const { data: emailFiltersData, isLoading: emailFiltersLoading } = useQuery({
    queryKey: ['admin', 'broadcasts', 'email-filters'],
    queryFn: adminBroadcastsApi.getEmailFilters,
    enabled: emailEnabled,
  });

  // Fetch buttons
  const { data: buttonsData } = useQuery({
    queryKey: ['admin', 'broadcasts', 'buttons'],
    queryFn: adminBroadcastsApi.getButtons,
    enabled: telegramEnabled,
  });

  // Preview mutations — separate for each channel
  const telegramPreviewMutation = useMutation({
    mutationFn: adminBroadcastsApi.preview,
  });

  const emailPreviewMutation = useMutation({
    mutationFn: adminBroadcastsApi.previewEmail,
  });

  // Create mutation (used for single-channel sends)
  const createMutation = useMutation({
    mutationFn: adminBroadcastsApi.createCombined,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      navigate(`/admin/broadcasts/${data.id}`);
    },
  });

  // Group Telegram filters
  const groupedTelegramFilters = useMemo(() => {
    if (!filtersData) return {};
    const groups: Record<string, (BroadcastFilter | TariffFilter)[]> = {};

    filtersData.filters.forEach((f) => {
      const group = f.group || 'basic';
      if (!groups[group]) groups[group] = [];
      groups[group].push(f);
    });

    if (filtersData.tariff_filters.length > 0) {
      groups['tariff'] = filtersData.tariff_filters;
    }

    filtersData.custom_filters.forEach((f) => {
      const group = f.group || 'custom';
      if (!groups[group]) groups[group] = [];
      groups[group].push(f);
    });

    return groups;
  }, [filtersData]);

  // Group Email filters
  const groupedEmailFilters = useMemo(() => {
    if (!emailFiltersData) return {};
    const groups: Record<string, BroadcastFilter[]> = {};

    emailFiltersData.filters.forEach((f) => {
      const group = f.group || 'email';
      if (!groups[group]) groups[group] = [];
      groups[group].push(f);
    });

    return groups;
  }, [emailFiltersData]);

  // Selected filter info for each channel
  const selectedTelegramFilter = useMemo(() => {
    if (!telegramTarget || !filtersData) return null;
    const all = [
      ...filtersData.filters,
      ...filtersData.tariff_filters,
      ...filtersData.custom_filters,
    ];
    return all.find((f) => f.key === telegramTarget) ?? null;
  }, [telegramTarget, filtersData]);

  const selectedEmailFilter = useMemo(() => {
    if (!emailTarget || !emailFiltersData) return null;
    return emailFiltersData.filters.find((f) => f.key === emailTarget) ?? null;
  }, [emailTarget, emailFiltersData]);

  // Handle toggling channels
  const handleToggleTelegram = () => {
    setTelegramEnabled((prev) => !prev);
    setTelegramTarget('');
    telegramPreviewMutation.reset();
  };

  const handleToggleEmail = () => {
    setEmailEnabled((prev) => !prev);
    setEmailTarget('');
    emailPreviewMutation.reset();
  };

  // Handle filter selection per channel
  const handleTelegramFilterSelect = (filterKey: string) => {
    setTelegramTarget(filterKey);
    setShowTelegramFilters(false);
    telegramPreviewMutation.mutate(filterKey);
  };

  const handleEmailFilterSelect = (filterKey: string) => {
    setEmailTarget(filterKey);
    setShowEmailFilters(false);
    emailPreviewMutation.mutate(filterKey);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine type locally to avoid stale state in async call
    let detectedType: 'photo' | 'video' | 'document';
    if (file.type.startsWith('image/')) {
      detectedType = 'photo';
    } else if (file.type.startsWith('video/')) {
      detectedType = 'video';
    } else {
      detectedType = 'document';
    }

    setMediaFile(file);
    setMediaType(detectedType);

    if (detectedType === 'photo') {
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
      const url = URL.createObjectURL(file);
      mediaPreviewRef.current = url;
      setMediaPreview(url);
    } else {
      setMediaPreview(null);
    }

    setIsUploading(true);
    try {
      const result = await adminBroadcastsApi.uploadMedia(file, detectedType);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle button
  const toggleButton = (key: string) => {
    setSelectedButtons((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key],
    );
  };

  // Custom button validation
  const isNewButtonValid = useMemo(() => {
    if (!newButtonLabel.trim() || !newButtonActionValue.trim()) return false;
    if (newButtonActionType === 'url') {
      return /^https:\/\/|^tg:\/\//.test(newButtonActionValue.trim());
    }
    if (newButtonActionType === 'callback') {
      return new TextEncoder().encode(newButtonActionValue.trim()).length <= 64;
    }
    return true;
  }, [newButtonLabel, newButtonActionType, newButtonActionValue]);

  // Custom button handlers
  const addCustomButton = () => {
    if (!isNewButtonValid) return;
    setCustomButtons((prev) => [
      ...prev,
      {
        label: newButtonLabel.trim(),
        action_type: newButtonActionType,
        action_value: newButtonActionValue.trim(),
      },
    ]);
    setNewButtonLabel('');
    setNewButtonActionValue('');
    setNewButtonActionType('callback');
    setIsAddingCustomButton(false);
  };

  const removeCustomButton = (index: number) => {
    setCustomButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const isTelegramValid = telegramEnabled && telegramTarget && messageText.trim().length > 0;
  const isEmailValid =
    emailEnabled && emailTarget && emailSubject.trim().length > 0 && emailContent.trim().length > 0;

  const isValid = useMemo(() => {
    if (!telegramEnabled && !emailEnabled) return false;
    if (telegramEnabled && !isTelegramValid) return false;
    if (emailEnabled && !isEmailValid) return false;
    return true;
  }, [telegramEnabled, emailEnabled, isTelegramValid, isEmailValid]);

  const bothChannels = telegramEnabled && emailEnabled;

  // Submit
  const handleSubmit = async () => {
    if (!isValid) return;

    // Single channel — use existing createMutation with navigation to detail
    if (telegramEnabled && !emailEnabled) {
      const data: CombinedBroadcastCreateRequest = {
        channel: 'telegram',
        target: telegramTarget,
        message_text: messageText,
        selected_buttons: selectedButtons,
        custom_buttons: customButtons.length > 0 ? customButtons : undefined,
      };
      if (uploadedFileId) {
        data.media = { type: mediaType, file_id: uploadedFileId };
      }
      createMutation.mutate(data);
      return;
    }

    if (emailEnabled && !telegramEnabled) {
      const data: CombinedBroadcastCreateRequest = {
        channel: 'email',
        target: emailTarget,
        email_subject: emailSubject,
        email_html_content: emailContent,
      };
      createMutation.mutate(data);
      return;
    }

    // Both channels — two sequential requests, navigate to list
    setIsSubmitting(true);
    try {
      const telegramData: CombinedBroadcastCreateRequest = {
        channel: 'telegram',
        target: telegramTarget,
        message_text: messageText,
        selected_buttons: selectedButtons,
        custom_buttons: customButtons.length > 0 ? customButtons : undefined,
      };
      if (uploadedFileId) {
        telegramData.media = { type: mediaType, file_id: uploadedFileId };
      }

      const emailData: CombinedBroadcastCreateRequest = {
        channel: 'email',
        target: emailTarget,
        email_subject: emailSubject,
        email_html_content: emailContent,
      };

      await adminBroadcastsApi.createCombined(telegramData);
      await adminBroadcastsApi.createCombined(emailData);

      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      navigate('/admin/broadcasts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recipients counts per channel
  const telegramRecipientsCount = telegramEnabled
    ? (telegramPreviewMutation.data?.count ?? selectedTelegramFilter?.count ?? null)
    : null;

  const emailRecipientsCount = emailEnabled
    ? (emailPreviewMutation.data?.count ?? selectedEmailFilter?.count ?? null)
    : null;

  const isPending = createMutation.isPending || isSubmitting;

  // Render filter dropdown
  const renderFilterDropdown = (
    channelType: 'telegram' | 'email',
    target: string,
    selectedFilter: BroadcastFilter | TariffFilter | null,
    recipientsCount: number | null,
    showFilters: boolean,
    setShowFilters: (v: boolean) => void,
    handleFilterSelect: (key: string) => void,
    groupedFilters: Record<string, (BroadcastFilter | TariffFilter)[]>,
    isLoading: boolean,
  ) => (
    <div>
      <label className="text-muted-foreground mb-2 block text-sm font-medium">
        {channelType === 'telegram'
          ? t('admin.broadcasts.selectFilter')
          : t('admin.broadcasts.selectEmailFilter')}
      </label>
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex w-full items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-2">
            <UsersIcon />
            <span className={selectedFilter ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedFilter
                ? selectedFilter.label
                : channelType === 'telegram'
                  ? t('admin.broadcasts.selectFilterPlaceholder')
                  : t('admin.broadcasts.selectEmailFilterPlaceholder')}
            </span>
            {recipientsCount !== null && (
              <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs">
                {recipientsCount} {t('admin.broadcasts.recipients')}
              </span>
            )}
          </div>
          <ChevronDownIcon />
        </Button>

        {showFilters && (
          <div className="border-border bg-card absolute top-full right-0 left-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-xl">
            {isLoading ? (
              <div className="text-muted-foreground p-4 text-center">{t('common.loading')}</div>
            ) : (
              Object.entries(groupedFilters).map(([group, filters]) => (
                <div key={group}>
                  <div className="bg-background text-muted-foreground sticky top-0 px-3 py-2 text-xs font-medium">
                    {FILTER_GROUP_LABEL_KEYS[group] ? t(FILTER_GROUP_LABEL_KEYS[group]) : group}
                  </div>
                  {filters.map((filter) => (
                    <Button
                      key={filter.key}
                      variant="ghost"
                      onClick={() => handleFilterSelect(filter.key)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left ${
                        target === filter.key ? 'bg-primary/20' : ''
                      }`}
                    >
                      <span className="text-foreground">{filter.label}</span>
                      {filter.count !== null && filter.count !== undefined && (
                        <span className="text-muted-foreground text-xs">{filter.count}</span>
                      )}
                    </Button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 text-primary rounded-lg p-2">
            <BroadcastIcon />
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold">{t('admin.broadcasts.create')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.broadcasts.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Channel toggles */}
      <Card>
        <label className="text-muted-foreground mb-3 block text-sm font-medium">
          {t('admin.broadcasts.selectChannel')}
        </label>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleToggleTelegram}
            className={`flex flex-1 items-center justify-center gap-2 p-4 ${
              telegramEnabled
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <TelegramIcon />
            <span className="font-medium">{t('admin.broadcasts.enableTelegram')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleEmail}
            className={`flex flex-1 items-center justify-center gap-2 p-4 ${
              emailEnabled ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'
            }`}
          >
            <EmailIcon />
            <span className="font-medium">{t('admin.broadcasts.enableEmail')}</span>
          </Button>
        </div>
        {!telegramEnabled && !emailEnabled && (
          <p className="text-error-400 mt-2 text-sm">{t('admin.broadcasts.atLeastOneChannel')}</p>
        )}
        {bothChannels && (
          <p className="text-primary mt-2 text-sm">{t('admin.broadcasts.sendingBoth')}</p>
        )}
      </Card>

      {/* Telegram section */}
      {telegramEnabled && (
        <Card className="space-y-6">
          <h2 className="text-foreground text-lg font-semibold">
            {t('admin.broadcasts.telegramSection')}
          </h2>

          {/* Telegram filter selection */}
          {renderFilterDropdown(
            'telegram',
            telegramTarget,
            selectedTelegramFilter,
            telegramRecipientsCount,
            showTelegramFilters,
            setShowTelegramFilters,
            handleTelegramFilterSelect,
            groupedTelegramFilters,
            filtersLoading,
          )}

          {/* Message text */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.broadcasts.messageText')}
            </label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('admin.broadcasts.messageTextPlaceholder')}
              rows={6}
              maxLength={4000}
              className="min-h-37.5 resize-y"
            />
            <div className="text-muted-foreground mt-1 text-right text-xs">
              {messageText.length}/4000
            </div>
          </div>

          {/* Media upload */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.broadcasts.media')}
            </label>
            {mediaFile ? (
              <div className="border-border bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mediaType === 'photo' && <PhotoIcon />}
                    {mediaType === 'video' && <VideoIcon />}
                    {mediaType === 'document' && <DocumentIcon />}
                    <div>
                      <p className="text-foreground text-sm">{mediaFile.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveMedia}
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
                    {t('admin.broadcasts.uploading')}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-card/50 text-muted-foreground hover:bg-card flex w-full items-center justify-center gap-2 border-dashed p-6"
                >
                  <PhotoIcon />
                  <span>{t('admin.broadcasts.addMedia')}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Buttons selection */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.broadcasts.buttons')}
            </label>
            <div className="flex flex-wrap gap-2">
              {buttonsData?.buttons.map((button) => (
                <Button
                  key={button.key}
                  variant={selectedButtons.includes(button.key) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleButton(button.key)}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom buttons */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.broadcasts.customButtons')}
            </label>

            {/* Existing custom buttons */}
            {customButtons.length > 0 && (
              <div className="mb-3 space-y-2">
                {customButtons.map((btn, index) => (
                  <div
                    key={index}
                    className="border-border bg-card flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                        {btn.action_type === 'url'
                          ? t('admin.broadcasts.customButtonTypeUrl')
                          : t('admin.broadcasts.customButtonTypeCallback')}
                      </span>
                      <span className="text-foreground truncate text-sm">{btn.label}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {btn.action_value}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomButton(index)}
                      className="ml-2 shrink-0"
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline add form */}
            {isAddingCustomButton ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustomButton();
                }}
                className="border-border bg-card/50 space-y-3 rounded-lg border p-3"
              >
                <Input
                  type="text"
                  value={newButtonLabel}
                  onChange={(e) => setNewButtonLabel(e.target.value)}
                  placeholder={t('admin.broadcasts.customButtonLabelPlaceholder')}
                  maxLength={64}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newButtonActionType === 'callback' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewButtonActionType('callback')}
                  >
                    {t('admin.broadcasts.customButtonTypeCallback')}
                  </Button>
                  <Button
                    type="button"
                    variant={newButtonActionType === 'url' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewButtonActionType('url')}
                  >
                    {t('admin.broadcasts.customButtonTypeUrl')}
                  </Button>
                </div>
                <Input
                  type="text"
                  value={newButtonActionValue}
                  onChange={(e) => setNewButtonActionValue(e.target.value)}
                  placeholder={
                    newButtonActionType === 'url'
                      ? t('admin.broadcasts.customButtonUrlPlaceholder')
                      : t('admin.broadcasts.customButtonCallbackPlaceholder')
                  }
                  maxLength={newButtonActionType === 'callback' ? 64 : 256}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setIsAddingCustomButton(false);
                      setNewButtonLabel('');
                      setNewButtonActionValue('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={!isNewButtonValid} className="flex-1">
                    {t('common.add')}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsAddingCustomButton(true)}
                disabled={customButtons.length >= 10}
                className="bg-card/50 text-muted-foreground hover:bg-card flex w-full items-center justify-center gap-2 border-dashed"
              >
                <span>+</span>
                <span>{t('admin.broadcasts.addCustomButton')}</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Email section */}
      {emailEnabled && (
        <Card className="space-y-6">
          <h2 className="text-foreground text-lg font-semibold">
            {t('admin.broadcasts.emailSection')}
          </h2>

          {/* Email filter selection */}
          {renderFilterDropdown(
            'email',
            emailTarget,
            selectedEmailFilter,
            emailRecipientsCount,
            showEmailFilters,
            setShowEmailFilters,
            handleEmailFilterSelect,
            groupedEmailFilters,
            emailFiltersLoading,
          )}

          {/* Email subject */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.broadcasts.emailSubject')}
            </label>
            <Input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder={t('admin.broadcasts.emailSubjectPlaceholder')}
              maxLength={200}
            />
          </div>

          {/* Email content */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              {t('admin.broadcasts.emailContent')}
            </label>
            <p className="text-muted-foreground mb-2 text-xs">
              {t('admin.broadcasts.emailContentHint')}
            </p>
            <Textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder={t('admin.broadcasts.emailContentPlaceholder')}
              rows={10}
              className="min-h-50 resize-y font-mono text-sm"
            />
          </div>

          {/* Email variables hint */}
          <div className="border-border bg-card/50 rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              {t('admin.broadcasts.emailVariables')}
            </p>
            <div className="flex flex-wrap gap-2">
              {['{{user_name}}', '{{email}}', '{{user_id}}'].map((variable) => (
                <code key={variable} className="bg-muted text-primary rounded px-2 py-1 text-xs">
                  {variable}
                </code>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Footer */}
      <Card className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {(telegramRecipientsCount !== null || emailRecipientsCount !== null) && (
            <span>
              {t('admin.broadcasts.willBeSent')}:{' '}
              {telegramRecipientsCount !== null && (
                <>
                  <strong className="text-primary">{telegramRecipientsCount}</strong> (TG)
                </>
              )}
              {telegramRecipientsCount !== null && emailRecipientsCount !== null && ' + '}
              {emailRecipientsCount !== null && (
                <>
                  <strong className="text-primary">{emailRecipientsCount}</strong> (Email)
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/broadcasts')}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending || isUploading}
            className="flex items-center gap-2"
          >
            {isPending ? <RefreshIcon /> : <BroadcastIcon />}
            {t('admin.broadcasts.send')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
