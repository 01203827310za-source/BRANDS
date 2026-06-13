import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

export function StatCard({ label, value, delta, deltaPositive, icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10', loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {loading ? (
          <div className="h-8 w-20 bg-muted rounded-md animate-pulse mt-1.5" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
        )}
        {delta && (
          <p className={cn('text-xs mt-1', deltaPositive ? 'text-green-600' : 'text-red-600')}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </p>
        )}
      </div>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconBg)}>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
    </div>
  );
}
