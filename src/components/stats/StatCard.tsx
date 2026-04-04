import { type ReactNode } from 'react';

const DEFAULT_VALUE_CLASS = 'text-foreground';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  icon,
  valueClassName = DEFAULT_VALUE_CLASS,
}: StatCardProps) {
  return (
    <div className="bg-card/30 rounded-xl p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 truncate text-base font-semibold sm:text-lg ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}
