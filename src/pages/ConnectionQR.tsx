import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useBranding } from '../hooks/useBranding';
import { AdminBackButton } from '@/components/admin';

interface ConnectionQRState {
  url: string;
  hideLink: boolean;
  subscriptionId?: number;
}

function isValidState(state: unknown): state is ConnectionQRState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  return typeof s.url === 'string' && s.url.length > 0 && typeof s.hideLink === 'boolean';
}

export default function ConnectionQR() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { appName } = useBranding();

  const state = location.state as unknown;
  const validState = isValidState(state) ? state : null;
  const subId = validState?.subscriptionId;
  const connectionPath = subId ? `/connection?sub=${subId}` : '/connection';

  useEffect(() => {
    if (!validState) {
      navigate(connectionPath, { replace: true });
    }
  }, [validState, navigate, connectionPath]);

  if (!validState) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={connectionPath} replace />
        <h1 className="text-foreground text-2xl font-bold">
          {t('subscription.connection.qrTitle')}
        </h1>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex w-full max-w-sm flex-col items-center px-6">
          {appName && (
            <p className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
              {appName}
            </p>
          )}

          <p className="text-muted-foreground mb-8 text-center text-sm">
            {t('subscription.connection.qrScanHint')}
          </p>

          <div className="rounded-3xl bg-white p-6">
            <QRCodeSVG
              value={validState.url}
              size={280}
              level="M"
              includeMargin={false}
              className="h-70 w-70 sm:h-90 sm:w-90"
            />
          </div>

          {!validState.hideLink && (
            <p className="text-muted-foreground mt-6 max-w-full truncate text-center font-mono text-xs">
              {validState.url}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
