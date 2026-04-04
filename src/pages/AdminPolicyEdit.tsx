import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, AccessPolicy, CreatePolicyPayload, UpdatePolicyPayload } from '@/api/rbac';
import { AdminBackButton } from '@/components/admin';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// === Types ===

interface PolicyConditions {
  time_range?: { start: string; end: string };
  ip_whitelist?: string[];
  rate_limit?: number;
  weekdays?: number[];
}

interface PolicyFormData {
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  resource: string;
  actions: string[];
  role_id: number | null;
  priority: number;
  conditions: PolicyConditions;
  conditionsEnabled: {
    time_range: boolean;
    ip_whitelist: boolean;
    rate_limit: boolean;
    weekdays: boolean;
  };
}

const INITIAL_FORM: PolicyFormData = {
  name: '',
  description: '',
  effect: 'allow',
  resource: '',
  actions: [],
  role_id: null,
  priority: 0,
  conditions: {
    time_range: { start: '09:00', end: '18:00' },
    ip_whitelist: [],
    rate_limit: 100,
    weekdays: [1, 2, 3, 4, 5],
  },
  conditionsEnabled: {
    time_range: false,
    ip_whitelist: false,
    rate_limit: false,
    weekdays: false,
  },
};

// === Helpers ===

function parseConditions(raw: Record<string, unknown>): PolicyConditions {
  const result: PolicyConditions = {};

  if (raw.time_range && typeof raw.time_range === 'object') {
    const tr = raw.time_range as Record<string, unknown>;
    if (typeof tr.start === 'string' && typeof tr.end === 'string') {
      result.time_range = { start: tr.start, end: tr.end };
    }
  }

  if (Array.isArray(raw.ip_whitelist)) {
    result.ip_whitelist = raw.ip_whitelist.filter((ip): ip is string => typeof ip === 'string');
  }

  if (typeof raw.rate_limit === 'number') {
    result.rate_limit = raw.rate_limit;
  }

  if (Array.isArray(raw.weekdays)) {
    result.weekdays = raw.weekdays.filter((d): d is number => typeof d === 'number');
  }

  return result;
}

function buildConditionsPayload(
  conditions: PolicyConditions,
  enabled: PolicyFormData['conditionsEnabled'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (enabled.time_range && conditions.time_range) {
    result.time_range = conditions.time_range;
  }
  if (enabled.ip_whitelist && conditions.ip_whitelist && conditions.ip_whitelist.length > 0) {
    result.ip_whitelist = conditions.ip_whitelist;
  }
  if (enabled.rate_limit && conditions.rate_limit !== undefined) {
    result.rate_limit = conditions.rate_limit;
  }
  if (enabled.weekdays && conditions.weekdays && conditions.weekdays.length > 0) {
    result.weekdays = conditions.weekdays;
  }

  return result;
}

// === Sub-components ===

interface IpTagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
}

function IpTagInput({ values, onChange }: IpTagInputProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const trimmed = inputValue.trim().replace(/,+$/, '');
        if (trimmed && !values.includes(trimmed)) {
          onChange([...values, trimmed]);
        }
        setInputValue('');
      } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
        onChange(values.slice(0, -1));
      }
    },
    [inputValue, values, onChange],
  );

  const removeIp = useCallback(
    (ip: string) => {
      onChange(values.filter((v) => v !== ip));
    },
    [values, onChange],
  );

  return (
    <div className="border-border bg-background flex flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2">
      {values.map((ip) => (
        <span
          key={ip}
          className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
        >
          {ip}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeIp(ip)}
            className="text-muted-foreground hover:text-foreground h-4 w-4 p-0"
            aria-label={t('admin.policies.conditions.removeIp', { ip })}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-foreground placeholder-muted-foreground min-w-30 flex-1 bg-transparent text-sm outline-none"
        placeholder={values.length === 0 ? t('admin.policies.conditions.ipPlaceholder') : ''}
      />
    </div>
  );
}

interface ConditionToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConditionToggle({ label, enabled, onToggle, children }: ConditionToggleProps) {
  return (
    <div className="border-border/50 bg-card/30 rounded-lg border">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="flex h-auto w-full items-center justify-between rounded-none px-3 py-2 hover:bg-transparent"
      >
        <span className="text-foreground text-sm font-medium">{label}</span>
        <div
          className={`relative h-5 w-9 rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </Button>
      {enabled && <div className="border-border/50 border-t px-3 py-2.5">{children}</div>}
    </div>
  );
}

// === Main Page ===

export default function AdminPolicyEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<PolicyFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch policy for editing
  const { isLoading: isLoadingPolicy } = useQuery({
    queryKey: ['admin-policy', id],
    queryFn: () => rbacApi.getPolicies(),
    enabled: isEdit,
    select: useCallback(
      (policies: AccessPolicy[]) => {
        const policy = policies.find((p) => p.id === Number(id));
        if (policy) {
          const parsed = parseConditions(policy.conditions);
          const actions = Array.isArray(policy.actions) ? policy.actions : [];

          setFormData({
            name: policy.name,
            description: policy.description ?? '',
            effect: policy.effect,
            resource: policy.resource,
            actions,
            role_id: policy.role_id ?? null,
            priority: policy.priority,
            conditions: {
              time_range: parsed.time_range ?? { start: '09:00', end: '18:00' },
              ip_whitelist: parsed.ip_whitelist ?? [],
              rate_limit: parsed.rate_limit ?? 100,
              weekdays: parsed.weekdays ?? [1, 2, 3, 4, 5],
            },
            conditionsEnabled: {
              time_range: !!parsed.time_range,
              ip_whitelist: !!parsed.ip_whitelist && parsed.ip_whitelist.length > 0,
              rate_limit: parsed.rate_limit !== undefined,
              weekdays: !!parsed.weekdays && parsed.weekdays.length > 0,
            },
          });
        }
        return policy;
      },
      [id],
    ),
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  const { data: permissionRegistry } = useQuery({
    queryKey: ['admin-permission-registry'],
    queryFn: rbacApi.getPermissionRegistry,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreatePolicyPayload) => rbacApi.createPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      navigate('/admin/policies');
    },
    onError: () => {
      setFormError(t('admin.policies.errors.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ policyId, payload }: { policyId: number; payload: UpdatePolicyPayload }) =>
      rbacApi.updatePolicy(policyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      navigate('/admin/policies');
    },
    onError: () => {
      setFormError(t('admin.policies.errors.updateFailed'));
    },
  });

  // Derived data
  const selectedResourceActions = useMemo(() => {
    if (!formData.resource || !permissionRegistry) return [];
    const section = permissionRegistry.find((s) => s.section === formData.resource);
    return section?.actions ?? [];
  }, [formData.resource, permissionRegistry]);

  // Handlers
  const handleToggleAction = useCallback((action: string) => {
    setFormData((prev) => {
      const has = prev.actions.includes(action);
      return {
        ...prev,
        actions: has ? prev.actions.filter((a) => a !== action) : [...prev.actions, action],
      };
    });
  }, []);

  const handleResourceChange = useCallback((resource: string) => {
    setFormData((prev) => ({
      ...prev,
      resource,
      actions: [],
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.name.trim()) {
        setFormError(t('admin.policies.errors.nameRequired'));
        return;
      }
      if (!formData.resource) {
        setFormError(t('admin.policies.errors.resourceRequired'));
        return;
      }
      if (formData.actions.length === 0) {
        setFormError(t('admin.policies.errors.actionsRequired'));
        return;
      }

      const conditionsPayload = buildConditionsPayload(
        formData.conditions,
        formData.conditionsEnabled,
      );

      if (isEdit) {
        const payload: UpdatePolicyPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          effect: formData.effect,
          resource: formData.resource,
          actions: formData.actions,
          conditions: conditionsPayload,
          priority: formData.priority,
          role_id: formData.role_id,
        };
        updateMutation.mutate({ policyId: Number(id), payload });
      } else {
        const payload: CreatePolicyPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          effect: formData.effect,
          resource: formData.resource,
          actions: formData.actions,
          conditions: conditionsPayload,
          priority: formData.priority,
          role_id: formData.role_id,
        };
        createMutation.mutate(payload);
      }
    },
    [formData, isEdit, id, createMutation, updateMutation, t],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Loading state
  if (isEdit && isLoadingPolicy) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/policies" />
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {isEdit ? t('admin.policies.modal.editTitle') : t('admin.policies.modal.createTitle')}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="policy-name"
                className="text-foreground mb-1 block text-sm font-medium"
              >
                {t('admin.policies.form.name')}
              </label>
              <input
                id="policy-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="border-border bg-background text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-2 transition-colors outline-none"
                placeholder={t('admin.policies.form.namePlaceholder')}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="policy-description"
                className="text-foreground mb-1 block text-sm font-medium"
              >
                {t('admin.policies.form.description')}
              </label>
              <textarea
                id="policy-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="border-border bg-background text-foreground placeholder-muted-foreground focus:border-primary w-full rounded-lg border px-3 py-2 transition-colors outline-none"
                placeholder={t('admin.policies.form.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Effect toggle */}
            <div>
              <label className="text-foreground mb-1 block text-sm font-medium">
                {t('admin.policies.form.effect')}
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, effect: 'allow' }))}
                  className={`flex-1 rounded-lg transition-colors ${
                    formData.effect === 'allow'
                      ? 'border-success-500/50 bg-success-500/10 text-success-400 hover:bg-success-500/10'
                      : 'bg-background text-muted-foreground hover:border-border'
                  }`}
                >
                  {t('admin.policies.effectAllow')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, effect: 'deny' }))}
                  className={`flex-1 rounded-lg transition-colors ${
                    formData.effect === 'deny'
                      ? 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/10'
                      : 'bg-background text-muted-foreground hover:border-border'
                  }`}
                >
                  {t('admin.policies.effectDeny')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Resource & Actions */}
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="space-y-4">
            {/* Resource dropdown */}
            <div>
              <label
                htmlFor="policy-resource"
                className="text-foreground mb-1 block text-sm font-medium"
              >
                {t('admin.policies.form.resource')}
              </label>
              <Select
                value={formData.resource || '__none__'}
                onValueChange={(v) => handleResourceChange(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2">
                  <SelectValue placeholder={t('admin.policies.form.selectResource')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t('admin.policies.form.selectResource')}
                  </SelectItem>
                  {permissionRegistry?.map((section) => (
                    <SelectItem key={section.section} value={section.section}>
                      {t(`admin.roles.form.permissionSections.${section.section}`, section.section)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions checkboxes */}
            {formData.resource && selectedResourceActions.length > 0 && (
              <div>
                <label className="text-foreground mb-1 block text-sm font-medium">
                  {t('admin.policies.form.actions')}
                </label>
                <div className="border-border bg-background/50 flex flex-wrap gap-2 rounded-lg border p-3">
                  {selectedResourceActions.map((action) => {
                    const selected = formData.actions.includes(action);
                    return (
                      <Button
                        key={action}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAction(action)}
                        className={`h-auto rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-primary/20 text-primary hover:bg-primary/20'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-muted-foreground'
                        }`}
                        aria-pressed={selected}
                      >
                        {t(`admin.roles.form.permissionActions.${action}`, action)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Role dropdown */}
            <div>
              <label
                htmlFor="policy-role"
                className="text-foreground mb-1 block text-sm font-medium"
              >
                {t('admin.policies.form.role')}
              </label>
              <Select
                value={formData.role_id != null ? String(formData.role_id) : '__global__'}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    role_id: v === '__global__' ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">
                    {t('admin.policies.form.globalOption')}
                  </SelectItem>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('admin.policies.form.roleHint')}
              </p>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="policy-priority"
                className="text-foreground mb-1 block text-sm font-medium"
              >
                {t('admin.policies.form.priority')}
              </label>
              <input
                id="policy-priority"
                type="number"
                min={0}
                max={999}
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: Math.min(999, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="border-border bg-background text-foreground focus:border-primary w-full rounded-lg border px-3 py-2 transition-colors outline-none"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t('admin.policies.form.priorityHint')}
              </p>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <label className="text-foreground mb-3 block text-sm font-medium">
            {t('admin.policies.form.conditions')}
          </label>
          <div className="space-y-2">
            {/* Time range */}
            <ConditionToggle
              label={t('admin.policies.conditions.timeRange')}
              enabled={formData.conditionsEnabled.time_range}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    time_range: !prev.conditionsEnabled.time_range,
                  },
                }))
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={formData.conditions.time_range?.start ?? '09:00'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        time_range: {
                          start: e.target.value,
                          end: prev.conditions.time_range?.end ?? '18:00',
                        },
                      },
                    }))
                  }
                  className="border-border bg-background text-foreground focus:border-primary rounded-lg border px-2 py-1.5 text-sm outline-none"
                  aria-label={t('admin.policies.conditions.timeStart')}
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="time"
                  value={formData.conditions.time_range?.end ?? '18:00'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        time_range: {
                          start: prev.conditions.time_range?.start ?? '09:00',
                          end: e.target.value,
                        },
                      },
                    }))
                  }
                  className="border-border bg-background text-foreground focus:border-primary rounded-lg border px-2 py-1.5 text-sm outline-none"
                  aria-label={t('admin.policies.conditions.timeEnd')}
                />
              </div>
            </ConditionToggle>

            {/* IP whitelist */}
            <ConditionToggle
              label={t('admin.policies.conditions.ipWhitelist')}
              enabled={formData.conditionsEnabled.ip_whitelist}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    ip_whitelist: !prev.conditionsEnabled.ip_whitelist,
                  },
                }))
              }
            >
              <IpTagInput
                values={formData.conditions.ip_whitelist ?? []}
                onChange={(ips) =>
                  setFormData((prev) => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      ip_whitelist: ips,
                    },
                  }))
                }
              />
            </ConditionToggle>

            {/* Rate limit */}
            <ConditionToggle
              label={t('admin.policies.conditions.rateLimit')}
              enabled={formData.conditionsEnabled.rate_limit}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    rate_limit: !prev.conditionsEnabled.rate_limit,
                  },
                }))
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={formData.conditions.rate_limit ?? 100}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        rate_limit: Math.max(1, Number(e.target.value) || 1),
                      },
                    }))
                  }
                  className="border-border bg-background text-foreground focus:border-primary w-24 rounded-lg border px-2 py-1.5 text-sm outline-none"
                  aria-label={t('admin.policies.conditions.rateLimitValue')}
                />
                <span className="text-muted-foreground text-xs">
                  {t('admin.policies.conditions.perHour')}
                </span>
              </div>
            </ConditionToggle>

            {/* Weekdays */}
            <ConditionToggle
              label={t('admin.policies.conditions.weekdays')}
              enabled={formData.conditionsEnabled.weekdays}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    weekdays: !prev.conditionsEnabled.weekdays,
                  },
                }))
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const selected = (formData.conditions.weekdays ?? []).includes(day);
                  return (
                    <Button
                      key={day}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => {
                          const current = prev.conditions.weekdays ?? [];
                          const next = selected
                            ? current.filter((d) => d !== day)
                            : [...current, day];
                          return {
                            ...prev,
                            conditions: { ...prev.conditions, weekdays: next },
                          };
                        })
                      }
                      className={`h-auto rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-primary/20 text-primary hover:bg-primary/20'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-muted-foreground'
                      }`}
                      aria-pressed={selected}
                    >
                      {t(`admin.policies.conditions.day${day}`)}
                    </Button>
                  );
                })}
              </div>
            </ConditionToggle>
          </div>
        </div>

        {/* Error & Submit */}
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          {formError && <p className="text-error-400 mb-4 text-sm">{formError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/policies')}>
              {t('admin.policies.form.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('admin.policies.form.saving') : t('admin.policies.form.save')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
