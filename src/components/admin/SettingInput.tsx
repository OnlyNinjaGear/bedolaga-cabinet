import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingDefinition } from '../../api/adminSettings';
import { CheckIcon, CloseIcon, EditIcon } from './icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SettingInputProps {
  setting: SettingDefinition;
  onUpdate: (value: string) => void;
  disabled?: boolean;
}

// Check if value is likely JSON or multi-line
function isLongValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const str = String(value);
  return str.length > 50 || str.includes('\n') || str.startsWith('[') || str.startsWith('{');
}

// Check if key suggests it's a list or JSON config
function isListOrJsonKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('_items') ||
    lowerKey.includes('_config') ||
    lowerKey.includes('_keywords') ||
    lowerKey.includes('_list') ||
    lowerKey.includes('_json') ||
    lowerKey.includes('_template') ||
    lowerKey.includes('_periods') ||
    lowerKey.includes('_discounts') ||
    lowerKey.includes('_packages')
  );
}

export function SettingInput({ setting, onUpdate, disabled }: SettingInputProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = String(setting.current ?? '');
  const needsTextarea = isLongValue(currentValue) || isListOrJsonKey(setting.key);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
    }
  }, [value, isEditing]);

  const handleStart = () => {
    setValue(currentValue);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate(value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue('');
  };

  // Dropdown for choices
  if (setting.choices && setting.choices.length > 0) {
    return (
      <Select value={currentValue} onValueChange={(val) => onUpdate(val)} disabled={disabled}>
        <SelectTrigger className="min-w-35">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {setting.choices.map((choice, idx) => (
            <SelectItem key={idx} value={String(choice.value)}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Editing mode - Textarea for long values
  if (isEditing && needsTextarea) {
    return (
      <div className="w-full space-y-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            // Ctrl+Enter to save
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
          }}
          autoFocus
          placeholder={t('admin.settings.inputPlaceholder')}
          className="border-primary min-h-25 resize-none rounded-xl font-mono"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">{t('admin.settings.ctrlEnterHint')}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              {t('admin.settings.cancelButton')}
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <CheckIcon />
              {t('admin.settings.saveButton')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Editing mode - Regular input
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type={setting.type === 'int' || setting.type === 'float' ? 'number' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
          placeholder={t('admin.settings.inputPlaceholder')}
          className="w-48 sm:w-56"
        />
        <Button size="icon" onClick={handleSave} title={t('admin.settings.saveHint')}>
          <CheckIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleCancel}
          title={t('admin.settings.cancelHint')}
        >
          <CloseIcon />
        </Button>
      </div>
    );
  }

  // Display mode - Long value preview
  if (needsTextarea) {
    const displayValue = currentValue || '-';
    const previewValue =
      displayValue.length > 60 ? displayValue.slice(0, 60) + '...' : displayValue;

    return (
      <Button
        variant="outline"
        onClick={handleStart}
        disabled={disabled}
        className="group bg-muted/50 text-foreground hover:bg-muted h-auto w-full justify-start px-4 py-3 text-left font-mono text-sm"
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="line-clamp-2 flex-1 break-all">{previewValue}</span>
          <span className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors">
            <EditIcon />
          </span>
        </div>
      </Button>
    );
  }

  // Display mode - Short value
  return (
    <Button
      variant="outline"
      onClick={handleStart}
      disabled={disabled}
      className="group bg-muted text-foreground hover:bg-muted h-auto max-w-50 min-w-25 gap-2 truncate px-3 py-2.5 font-mono text-sm"
    >
      <span className="flex-1 truncate">{currentValue || '-'}</span>
      <span className="text-muted-foreground group-hover:text-primary opacity-0 transition-colors group-hover:opacity-100">
        <EditIcon />
      </span>
    </Button>
  );
}
