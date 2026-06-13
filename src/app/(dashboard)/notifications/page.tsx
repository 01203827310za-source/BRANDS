'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { DiscoveryTypeBadge, NotificationStatus } from '@/components/discoveries/badges';
import { timeAgo, truncate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Bell, ExternalLink, RotateCcw } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25', ...(statusFilter && { status: statusFilter }) });
      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'Error loading notifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const retry = async (discoveryId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoveryId, action: 'retry' }),
      });
      toast({ title: 'Notification retried' });
      fetchNotifications();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  return (
    <>
      <Header title="Notifications" description={`${total} total notifications`} />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Status</option>
            <option value="SENT">Sent</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-left">Discovery</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sent At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(7).fill(0).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>))}</tr>
                  ))
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No notifications yet.</p>
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3"><span className="text-xs font-semibold">{n.discovery?.brand?.name || '—'}</span></td>
                      <td className="px-4 py-3"><p className="text-xs text-foreground max-w-xs">{truncate(n.discovery?.title || '—', 70)}</p></td>
                      <td className="px-4 py-3">{n.discovery?.discoveryType ? <DiscoveryTypeBadge type={n.discovery.discoveryType} /> : '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{n.channel}</span></td>
                      <td className="px-4 py-3"><NotificationStatus status={n.status} /></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{n.sentAt ? timeAgo(n.sentAt) : '—'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {n.discovery?.url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={n.discovery.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>
                            </Button>
                          )}
                          {n.status === 'FAILED' && n.discoveryId && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => retry(n.discoveryId)} title="Retry">
                              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 25 >= total}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
