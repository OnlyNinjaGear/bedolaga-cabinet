import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';

export default function BlacklistedScreen() {
  const { t } = useTranslation();
  const blacklistedInfo = useBlockingStore((state) => state.blacklistedInfo);

  return (
    <div className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="bg-card mx-auto flex h-24 w-24 items-center justify-center rounded-full">
            <svg
              className="text-destructive h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-foreground mb-4 text-2xl font-bold">
          {t('blocking.blacklisted.title')}
        </h1>

        {/* Message */}
        <p className="text-muted-foreground mb-6 text-lg">
          {t('blocking.blacklisted.defaultMessage')}
        </p>

        {/* Reason */}
        {blacklistedInfo?.message && (
          <div className="bg-card/50 mb-6 rounded-xl p-4">
            <p className="text-muted-foreground mb-1 text-sm">
              {t('blocking.blacklisted.reason')}:
            </p>
            <p className="text-foreground">{blacklistedInfo.message}</p>
          </div>
        )}

        <p className="text-muted-foreground mt-8 text-sm">
          {t('blocking.blacklisted.contactSupport')}
        </p>
      </div>
    </div>
  );
}
