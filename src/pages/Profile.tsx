import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePlatform } from '@/platform';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import { authApi } from '../api/auth';
import { isValidEmail } from '../utils/validation';
import {
  notificationsApi,
  NotificationSettings,
  NotificationSettingsUpdate,
} from '../api/notifications';
import { referralApi } from '../api/referral';
import { brandingApi, type EmailAuthEnabled } from '../api/branding';
import { UI } from '../config/constants';
import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { Switch } from '@/components/primitives/Switch';
import { Input } from '@/components/ui/input';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import { UserThemePicker } from '@/components/profile/UserThemePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons
const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ShareIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8l5-5m0 0l5 5m-5-5v12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
    />
  </svg>
);

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inline email change flow
  const [changeEmailStep, setChangeEmailStep] = useState<'email' | 'code' | 'success' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [changeCode, setChangeCode] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationResendCooldown, setVerificationResendCooldown] = useState(0);
  const newEmailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Referral data
  const { data: referralInfo } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  const { data: referralTerms } = useQuery({
    queryKey: ['referral-terms'],
    queryFn: referralApi.getReferralTerms,
  });

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  // Check if email auth is enabled
  const { data: emailAuthConfig } = useQuery<EmailAuthEnabled>({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
    staleTime: 60000,
  });
  const isEmailAuthEnabled = emailAuthConfig?.enabled ?? true;
  const isEmailVerificationEnabled = emailAuthConfig?.verification_enabled ?? true;

  // Build referral link for cabinet
  const referralLink = referralInfo?.referral_code
    ? `${window.location.origin}/login?ref=${referralInfo.referral_code}`
    : '';

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralLink = () => {
    if (!referralLink) return;
    const shareText = t('referral.shareMessage', {
      percent: referralInfo?.commission_percent || 0,
      botName: branding?.name || import.meta.env.VITE_APP_NAME || 'Cabinet',
    });

    if (navigator.share) {
      navigator
        .share({
          title: t('referral.title'),
          text: shareText,
          url: referralLink,
        })
        .catch(() => {});
      return;
    }

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      setSuccess(t('profile.verificationResent'));
      setError(null);
      setVerificationResendCooldown(UI.RESEND_COOLDOWN_SEC);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || t('common.error'));
      setSuccess(null);
    },
  });

  // Email change mutations
  const requestEmailChangeMutation = useMutation({
    mutationFn: (emailAddr: string) => authApi.requestEmailChange(emailAddr),
    onSuccess: async (data) => {
      setChangeError(null);
      if (data.expires_in_minutes === 0) {
        // Unverified email was replaced directly
        setChangeEmailStep('success');
        const updatedUser = await authApi.getMe();
        setUser(updatedUser);
      } else {
        setChangeEmailStep('code');
        setResendCooldown(UI.RESEND_COOLDOWN_SEC);
      }
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      if (detail?.includes('already registered') || detail?.includes('already in use')) {
        setChangeError(t('profile.changeEmail.emailAlreadyUsed'));
      } else if (detail?.includes('same as current')) {
        setChangeError(t('profile.changeEmail.sameEmail'));
      } else if (detail?.includes('rate limit') || detail?.includes('too many')) {
        setChangeError(t('profile.changeEmail.tooManyRequests'));
      } else {
        setChangeError(detail || t('common.error'));
      }
    },
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: (verificationCode: string) => authApi.verifyEmailChange(verificationCode),
    onSuccess: async () => {
      setChangeError(null);
      setChangeEmailStep('success');
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      if (detail?.includes('invalid') || detail?.includes('wrong')) {
        setChangeError(t('profile.changeEmail.invalidCode'));
      } else if (detail?.includes('expired')) {
        setChangeError(t('profile.changeEmail.codeExpired'));
      } else {
        setChangeError(detail || t('common.error'));
      }
    },
  });

  // Resend cooldown timers
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (verificationResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setVerificationResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationResendCooldown]);

  // Auto-focus inputs on step change (skip on Telegram — keyboard hides bottom nav)
  const { platform: profilePlatform } = usePlatform();
  useEffect(() => {
    if (profilePlatform === 'telegram') return;
    const timer = setTimeout(() => {
      if (changeEmailStep === 'email') newEmailInputRef.current?.focus();
      else if (changeEmailStep === 'code') codeInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [changeEmailStep, profilePlatform]);

  // Auto-close success after 3s
  useEffect(() => {
    if (changeEmailStep !== 'success') return;
    const timer = setTimeout(() => resetChangeEmail(), 3000);
    return () => clearTimeout(timer);
  }, [changeEmailStep]);

  const resetChangeEmail = () => {
    setChangeEmailStep(null);
    setNewEmail('');
    setChangeCode('');
    setChangeError(null);
    setResendCooldown(0);
  };

  const handleSendChangeCode = () => {
    setChangeError(null);
    if (!newEmail.trim()) {
      setChangeError(t('profile.emailRequired'));
      return;
    }
    if (!isValidEmail(newEmail.trim())) {
      setChangeError(t('profile.invalidEmail'));
      return;
    }
    if (user?.email && newEmail.toLowerCase().trim() === user.email.toLowerCase()) {
      setChangeError(t('profile.changeEmail.sameEmail'));
      return;
    }
    requestEmailChangeMutation.mutate(newEmail.trim());
  };

  const handleVerifyChangeCode = () => {
    setChangeError(null);
    if (!changeCode.trim()) {
      setChangeError(t('profile.changeEmail.enterCode'));
      return;
    }
    if (changeCode.trim().length < 4) {
      setChangeError(t('profile.changeEmail.invalidCode'));
      return;
    }
    verifyEmailChangeMutation.mutate(changeCode.trim());
  };

  const handleResendChangeCode = () => {
    if (resendCooldown > 0) return;
    requestEmailChangeMutation.mutate(newEmail.trim());
  };

  const { data: notificationSettings, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: notificationsApi.getSettings,
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: notificationsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  const handleNotificationToggle = (key: keyof NotificationSettings, value: boolean) => {
    const update: NotificationSettingsUpdate = { [key]: value };
    updateNotificationsMutation.mutate(update);
  };

  const handleNotificationValue = (key: keyof NotificationSettings, value: number) => {
    const update: NotificationSettingsUpdate = { [key]: value };
    updateNotificationsMutation.mutate(update);
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-foreground text-2xl font-bold sm:text-3xl">{t('profile.title')}</h1>
      </motion.div>

      {/* User Info Card */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="text-foreground mb-6 text-lg font-semibold">{t('profile.accountInfo')}</h2>
          <div className="space-y-4">
            <div className="border-border/50 flex items-center justify-between border-b py-3">
              <span className="text-muted-foreground">{t('profile.telegramId')}</span>
              <span className="text-foreground font-medium">{user?.telegram_id}</span>
            </div>
            {user?.username && (
              <div className="border-border/50 flex items-center justify-between border-b py-3">
                <span className="text-muted-foreground">{t('profile.username')}</span>
                <span className="text-foreground font-medium">@{user.username}</span>
              </div>
            )}
            <div className="border-border/50 flex items-center justify-between border-b py-3">
              <span className="text-muted-foreground">{t('profile.name')}</span>
              <span className="text-foreground font-medium">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-muted-foreground">{t('profile.registeredAt')}</span>
              <span className="text-foreground font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Connected Accounts Link */}
      <motion.div variants={staggerItem}>
        <Card interactive onClick={() => navigate('/profile/accounts')}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-lg font-semibold">
                {t('profile.accounts.goToAccounts')}
              </h2>
              <p className="text-muted-foreground text-sm">{t('profile.accounts.subtitle')}</p>
            </div>
            <svg
              className="text-muted-foreground h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Card>
      </motion.div>

      {/* Referral Link Widget */}
      {referralTerms?.is_enabled && referralLink && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">{t('referral.yourLink')}</h2>
              <Link
                to="/referral"
                className="text-primary hover:text-primary/70 flex items-center gap-1 transition-colors"
              >
                <span className="text-sm">{t('referral.title')}</span>
                <ArrowRightIcon />
              </Link>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input type="text" readOnly value={referralLink} className="w-full text-sm" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyReferralLink}
                  variant={copied ? 'primary' : 'primary'}
                  className={copied ? 'bg-success-500 hover:bg-success-500' : ''}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">
                    {copied ? t('referral.copied') : t('referral.copyLink')}
                  </span>
                </Button>
                <Button onClick={shareReferralLink} variant="secondary">
                  <ShareIcon />
                  <span className="ml-2 hidden sm:inline">{t('referral.shareButton')}</span>
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              {t('referral.shareHint', { percent: referralInfo?.commission_percent || 0 })}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Email Section - only show when email auth is enabled */}
      {isEmailAuthEnabled && (
        <motion.div variants={staggerItem}>
          <Card>
            <h2 className="text-foreground mb-6 text-lg font-semibold">{t('profile.emailAuth')}</h2>

            {user?.email ? (
              <div className="space-y-4">
                <div className="border-border/50 flex items-center justify-between border-b py-3">
                  <span className="text-muted-foreground">Email</span>
                  <div className="flex items-center gap-3">
                    <span className="text-foreground font-medium">{user.email}</span>
                    {user.email_verified ? (
                      <span className="badge-success">{t('profile.verified')}</span>
                    ) : isEmailVerificationEnabled ? (
                      <span className="badge-warning">{t('profile.notVerified')}</span>
                    ) : null}
                  </div>
                </div>

                {!user.email_verified && isEmailVerificationEnabled && (
                  <div className="rounded-linear border-warning-500/30 bg-warning-500/10 border p-4">
                    <p className="text-warning-400 mb-4 text-sm">
                      {t('profile.verificationRequired')}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => resendVerificationMutation.mutate()}
                        loading={resendVerificationMutation.isPending}
                        disabled={verificationResendCooldown > 0}
                      >
                        {verificationResendCooldown > 0
                          ? t('profile.resendIn', { seconds: verificationResendCooldown })
                          : t('profile.resendVerification')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setChangeEmailStep('email')}
                        className="text-primary hover:text-primary/70 text-sm"
                      >
                        {t('profile.changeEmail.button')}
                      </Button>
                    </div>
                  </div>
                )}

                {user.email_verified && (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      {t('profile.canLoginWithEmail')}
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => setChangeEmailStep('email')}
                      className="text-primary hover:text-primary/70 flex items-center gap-2 text-sm"
                    >
                      <PencilIcon />
                      <span>{t('profile.changeEmail.button')}</span>
                    </Button>
                  </div>
                )}

                {/* Inline email change flow */}
                <AnimatePresence>
                  {changeEmailStep === 'email' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-border/50 space-y-3 border-t pt-4">
                        <label className="text-muted-foreground block text-sm font-medium">
                          {t('profile.changeEmail.newEmail')}
                        </label>
                        <Input
                          ref={newEmailInputRef}
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendChangeCode();
                            }
                          }}
                          placeholder="new@email.com"
                          className="w-full"
                          autoComplete="email"
                        />
                        {changeError && <p className="text-error-400 text-sm">{changeError}</p>}
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleSendChangeCode}
                            loading={requestEmailChangeMutation.isPending}
                            disabled={!newEmail.trim()}
                          >
                            {t('profile.changeEmail.sendCode')}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={resetChangeEmail}
                            className="text-muted-foreground hover:text-foreground text-sm"
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {changeEmailStep === 'code' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-border/50 space-y-3 border-t pt-4">
                        <div className="rounded-linear border-primary/30 bg-primary/10 border p-3">
                          <p className="text-primary text-sm">
                            {t('profile.changeEmail.codeSentTo', { email: newEmail })}
                          </p>
                        </div>
                        <label className="text-muted-foreground block text-sm font-medium">
                          {t('profile.changeEmail.verificationCode')}
                        </label>
                        <Input
                          ref={codeInputRef}
                          type="text"
                          inputMode="numeric"
                          value={changeCode}
                          onChange={(e) => setChangeCode(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleVerifyChangeCode();
                            }
                          }}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full text-center text-2xl tracking-[0.5em]"
                          autoComplete="one-time-code"
                        />
                        {changeError && <p className="text-error-400 text-sm">{changeError}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={handleVerifyChangeCode}
                              loading={verifyEmailChangeMutation.isPending}
                              disabled={!changeCode.trim()}
                            >
                              {t('profile.changeEmail.verify')}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setChangeEmailStep('email');
                                setChangeCode('');
                                setChangeError(null);
                              }}
                              className="text-muted-foreground hover:text-foreground text-sm"
                            >
                              {t('common.back')}
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={handleResendChangeCode}
                            disabled={resendCooldown > 0 || requestEmailChangeMutation.isPending}
                            className={`text-sm ${resendCooldown > 0 ? 'text-muted-foreground' : 'text-primary hover:text-primary/70'}`}
                          >
                            {resendCooldown > 0
                              ? t('profile.changeEmail.resendIn', { seconds: resendCooldown })
                              : t('profile.changeEmail.resendCode')}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {changeEmailStep === 'success' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-border/50 border-t pt-4">
                        <div className="rounded-linear border-success-500/30 bg-success-500/10 flex items-center gap-3 border p-4">
                          <CheckIcon />
                          <div>
                            <p className="text-success-400 font-medium">
                              {t('profile.changeEmail.success')}
                            </p>
                            <p className="text-muted-foreground text-sm">{newEmail}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">{t('profile.linkEmailDescription')}</p>
                <Button variant="primary" onClick={() => navigate('/profile/accounts')}>
                  {t('profile.linkEmail')}
                </Button>
              </div>
            )}

            {(error || success) && user?.email && (
              <div className="mt-4">
                {error && (
                  <div className="rounded-linear border-error-500/30 bg-error-500/10 text-error-400 border p-4 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-linear border-success-500/30 bg-success-500/10 text-success-400 border p-4 text-sm">
                    {success}
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Theme */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="text-foreground mb-6 text-lg font-semibold">Тема оформления</h2>
          <UserThemePicker />
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="text-foreground mb-6 text-lg font-semibold">
            {t('profile.notifications.title')}
          </h2>

          {notificationsLoading ? (
            <div className="flex justify-center py-4">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : notificationSettings ? (
            <div className="space-y-6">
              {/* Subscription Expiry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground font-medium">
                      {t('profile.notifications.subscriptionExpiry')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t('profile.notifications.subscriptionExpiryDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.subscription_expiry_enabled}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle('subscription_expiry_enabled', checked)
                    }
                  />
                </div>
                {notificationSettings.subscription_expiry_enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-muted-foreground text-sm">
                      {t('profile.notifications.daysBeforeExpiry')}
                    </span>
                    <Select
                      value={String(notificationSettings.subscription_expiry_days)}
                      onValueChange={(v) =>
                        handleNotificationValue('subscription_expiry_days', Number(v))
                      }
                    >
                      <SelectTrigger className="w-20 py-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 7, 14].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Traffic Warning */}
              <div className="border-border/50 space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground font-medium">
                      {t('profile.notifications.trafficWarning')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t('profile.notifications.trafficWarningDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.traffic_warning_enabled}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle('traffic_warning_enabled', checked)
                    }
                  />
                </div>
                {notificationSettings.traffic_warning_enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-muted-foreground text-sm">
                      {t('profile.notifications.atPercent')}
                    </span>
                    <Select
                      value={String(notificationSettings.traffic_warning_percent)}
                      onValueChange={(v) =>
                        handleNotificationValue('traffic_warning_percent', Number(v))
                      }
                    >
                      <SelectTrigger className="w-20 py-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[50, 70, 80, 90, 95].map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            {p}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Balance Low */}
              <div className="border-border/50 space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground font-medium">
                      {t('profile.notifications.balanceLow')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t('profile.notifications.balanceLowDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.balance_low_enabled}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle('balance_low_enabled', checked)
                    }
                  />
                </div>
                {notificationSettings.balance_low_enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-muted-foreground text-sm">
                      {t('profile.notifications.threshold')}
                    </span>
                    <Input
                      type="number"
                      value={notificationSettings.balance_low_threshold}
                      onChange={(e) =>
                        handleNotificationValue('balance_low_threshold', Number(e.target.value))
                      }
                      min={0}
                      className="w-24 py-1"
                    />
                  </div>
                )}
              </div>

              {/* News */}
              <div className="border-border/50 flex items-center justify-between border-t pt-6">
                <div>
                  <p className="text-foreground font-medium">{t('profile.notifications.news')}</p>
                  <p className="text-muted-foreground text-sm">
                    {t('profile.notifications.newsDesc')}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.news_enabled}
                  onCheckedChange={(checked) => handleNotificationToggle('news_enabled', checked)}
                />
              </div>

              {/* Promo Offers */}
              <div className="border-border/50 flex items-center justify-between border-t pt-6">
                <div>
                  <p className="text-foreground font-medium">
                    {t('profile.notifications.promoOffers')}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t('profile.notifications.promoOffersDesc')}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.promo_offers_enabled}
                  onCheckedChange={(checked) =>
                    handleNotificationToggle('promo_offers_enabled', checked)
                  }
                />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t('profile.notifications.unavailable')}</p>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
