import { cn, DISCOVERY_TYPE_CONFIG, SOURCE_TYPE_CONFIG } from '@/lib/utils';

export function DiscoveryTypeBadge({ type }: { type: string }) {
  const config = DISCOVERY_TYPE_CONFIG[type] || DISCOVERY_TYPE_CONFIG.OTHER;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      colorMap[config.color] || colorMap.gray
    )}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}

export function SourceTypeBadge({ type }: { type: string }) {
  const config = SOURCE_TYPE_CONFIG[type] || { label: type, icon: '📌' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function NotificationStatus({ status }: { status: string }) {
  const config = {
    SENT: { label: 'Sent', className: 'text-green-600 bg-green-50' },
    PENDING: { label: 'Pending', className: 'text-yellow-600 bg-yellow-50' },
    FAILED: { label: 'Failed', className: 'text-red-600 bg-red-50' },
  }[status] || { label: status, className: 'text-gray-600 bg-gray-50' };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
