import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('resetPassword.invalidToken', 'Invalid or missing reset token'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'Password must be at least 8 characters'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    setStatus('loading');

    try {
      await authApi.resetPassword(token, password);
      setStatus('success');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: unknown) {
      setStatus('error');
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || t('common.error'));
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
        <div className="from-background via-background to-background fixed inset-0 bg-gradient-to-br" />
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <div className="relative w-full max-w-md text-center">
          <Card>
            <div className="text-error-400 mb-4 text-5xl">!</div>
            <h2 className="text-foreground mb-2 text-xl font-semibold">
              {t('resetPassword.invalidToken', 'Invalid reset link')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                'resetPassword.tokenExpiredOrInvalid',
                'This password reset link is invalid or has expired.',
              )}
            </p>
            <Link to="/login" className="btn-primary inline-block w-full">
              {t('auth.backToLogin', 'Back to login')}
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
      <div className="from-background via-background to-background fixed inset-0 bg-gradient-to-br" />
      <div className="from-primary/10 fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent" />
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md">
        <Card>
          {status === 'success' ? (
            <div className="text-center">
              <div className="bg-success-500/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                <svg
                  className="text-success-400 h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-foreground mb-2 text-xl font-bold">
                {t('resetPassword.success', 'Password changed!')}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t('resetPassword.redirectingToLogin', 'Redirecting to login...')}
              </p>
              <div className="border-primary mx-auto h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : (
            <>
              <h2 className="text-foreground mb-2 text-center text-xl font-bold">
                {t('resetPassword.title', 'Set new password')}
              </h2>
              <p className="text-muted-foreground mb-6 text-center">
                {t('resetPassword.enterNewPassword', 'Enter your new password below.')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="label">
                    {t('auth.password', 'Password')}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={status === 'loading'}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    {t('auth.confirmPassword', 'Confirm Password')}
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={status === 'loading'}
                  />
                </div>

                {error && (
                  <div className="border-error-500/30 bg-error-500/10 text-error-400 rounded-xl border px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={status === 'loading'} className="w-full">
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('resetPassword.setPassword', 'Set new password')
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t('auth.backToLogin', 'Back to login')}
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
