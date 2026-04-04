import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi } from '@/api/rbac';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissionStore } from '@/store/permissions';
import { usePlatform } from '@/platform/hooks/usePlatform';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const BackIcon = () => (
  <svg
    className="text-muted-foreground h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

export default function AdminRoles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const canManageRole = usePermissionStore((s) => s.canManageRole);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDeleteConfirm(null);
    },
    onError: () => {
      setDeleteConfirm(null);
      setFormError(t('admin.roles.errors.deleteFailed'));
    },
  });

  // Sorted roles by level descending
  const sortedRoles = useMemo(() => {
    if (!roles) return [];
    return [...roles].sort((a, b) => b.level - a.level);
  }, [roles]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              className="rounded-xl"
            >
              <BackIcon />
            </Button>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold">{t('admin.roles.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.roles.subtitle')}</p>
          </div>
        </div>
        <PermissionGate permission="roles:create">
          <Button
            onClick={() => navigate('/admin/roles/create')}
            className="flex items-center justify-center gap-2"
          >
            <PlusIcon />
            {t('admin.roles.createRole')}
          </Button>
        </PermissionGate>
      </div>

      {/* Error message */}
      {formError && (
        <div className="border-error-500/30 bg-error-500/10 mb-4 rounded-lg border p-3">
          <p className="text-error-400 text-sm">{formError}</p>
        </div>
      )}

      {/* Stats Overview */}
      {sortedRoles.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-foreground text-2xl font-bold">{sortedRoles.length}</div>
            <div className="text-muted-foreground text-xs">{t('admin.roles.stats.totalRoles')}</div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-primary text-2xl font-bold">
              {sortedRoles.filter((r) => r.is_active).length}
            </div>
            <div className="text-muted-foreground text-xs">{t('admin.roles.stats.active')}</div>
          </div>
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="text-warning-400 text-2xl font-bold">
              {sortedRoles.filter((r) => r.is_system).length}
            </div>
            <div className="text-muted-foreground text-xs">{t('admin.roles.stats.system')}</div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {rolesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : rolesError ? (
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.roles.errors.loadFailed')}</p>
        </div>
      ) : sortedRoles.length === 0 ? (
        <div className="py-12 text-center">
          <ShieldIcon />
          <p className="text-muted-foreground mt-2">{t('admin.roles.noRoles')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRoles.map((role) => (
            <div
              key={role.id}
              className={`bg-card rounded-xl border p-4 transition-colors ${
                role.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  {/* Role name with color badge */}
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: role.color || '#6b7280' }}
                      aria-hidden="true"
                    />
                    <span className="text-foreground font-medium">{role.name}</span>
                    {role.is_system && (
                      <span className="bg-warning-500/20 text-warning-400 rounded px-1.5 py-0.5 text-xs">
                        {t('admin.roles.systemBadge')}
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                        {t('admin.roles.inactiveBadge')}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      {t('admin.roles.levelLabel')}: {role.level}
                    </span>
                    {role.description && <span>{role.description}</span>}
                    <span>{t('admin.roles.usersCount', { count: role.user_count ?? 0 })}</span>
                    <span>
                      {t('admin.roles.permissionsCount', {
                        count: role.permissions.length,
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-border flex items-center gap-2 border-t pt-3 sm:border-0 sm:pt-0">
                  <PermissionGate permission="roles:edit">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/admin/roles/${role.id}/edit`)}
                      disabled={!canManageRole(role.level)}
                      title={t('admin.roles.actions.edit')}
                    >
                      <EditIcon />
                    </Button>
                  </PermissionGate>
                  <PermissionGate permission="roles:delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(role.id)}
                      disabled={role.is_system || !canManageRole(role.level)}
                      className="hover:bg-error-500/20 hover:text-error-400"
                      title={t('admin.roles.actions.delete')}
                    >
                      <TrashIcon />
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.roles.confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.roles.confirm.text')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              {t('admin.roles.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              className="bg-error-500 hover:bg-error-600"
            >
              {deleteMutation.isPending
                ? t('admin.roles.confirm.deleting')
                : t('admin.roles.confirm.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
