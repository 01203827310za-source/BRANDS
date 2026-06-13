'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { StatCard } from '@/components/dashboard/stat-card';
import { DiscoveryTypeBadge, SourceTypeBadge, ConfidenceBar } from '@/components/discoveries/badges';
import { Button } from '@/components/ui/button';
import { timeAgo, formatDateTime } from '@/lib/utils';
import {
  Package, Compass, Tag, Bell, TrendingUp, Zap,
  RefreshCw, Activity, BarChart3, Clock, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from '@/hooks/use-toast';

const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#EF4444', '#22C55E', '#EAB308', '#6B7280'];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerCrawl = async () => {
    setCrawling(true);
    try {
      await fetch('/api/crawl', { method: 'POST', body: JSON.stringify({ type: 'crawl' }), headers: { 'Content-Type': 'application/json' } });
      toast({ title: 'Crawl cycle started', description: 'Monitoring all active brands now.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to start crawl', variant: 'destructive' });
    } finally {
      setTimeout(() => setCrawling(false), 3000);
    }
  };

  return (
    <>
      <Header
        title="Dashboard"
        description="Real-time brand intelligence overview"
        actions={
          <Button size="sm" onClick={triggerCrawl} disabled={crawling} variant="outline">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${crawling ? 'animate-spin' : ''}`} />
            {crawling ? 'Running…' : 'Run Crawl'}
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Brands" value={stats?.activeBrands ?? '—'} icon={Tag} iconColor="text-blue-600" iconBg="bg-blue-50" loading={loading} />
          <StatCard label="Total Discoveries" value={stats?.totalDiscoveries ?? '—'} delta={stats?.todayDiscoveries ? `${stats.todayDiscoveries} today` : undefined} deltaPositive icon={Compass} iconColor="text-purple-600" iconBg="bg-purple-50" loading={loading} />
          <StatCard label="Products Found" value={stats?.totalProducts ?? '—'} delta={stats?.newProductsToday ? `${stats.newProductsToday} today` : undefined} deltaPositive icon={Package} iconColor="text-emerald-600" iconBg="bg-emerald-50" loading={loading} />
          <StatCard label="Notifications Sent" value={stats?.notificationsSent ?? '—'} icon={Bell} iconColor="text-orange-600" iconBg="bg-orange-50" loading={loading} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Discovery Activity</h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            {stats?.last7Days ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.last7Days} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 bg-muted/30 rounded-lg animate-pulse" />
            )}
          </div>

          {/* Discovery types pie */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">By Type</h3>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            {stats?.discoveryTypes?.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={stats.discoveryTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={60} strokeWidth={0}>
                      {stats.discoveryTypes.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {stats.discoveryTypes.slice(0, 4).map((d: any, i: number) => (
                    <div key={d.type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.type.replace('_', ' ')}</span>
                      </div>
                      <span className="font-medium tabular-nums">{d.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-44 bg-muted/30 rounded-lg animate-pulse" />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent discoveries */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Recent Discoveries</h3>
              </div>
              <a href="/discoveries" className="text-xs text-primary hover:underline">View all →</a>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex gap-3">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-32 bg-muted rounded animate-pulse flex-1" />
                  </div>
                ))
              ) : stats?.recentDiscoveries?.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No discoveries yet. Run a crawl to get started.
                </div>
              ) : (
                stats?.recentDiscoveries?.map((d: any) => (
                  <div key={d.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{d.brand?.name}</span>
                        <DiscoveryTypeBadge type={d.discoveryType} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{d.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(d.createdAt)}</span>
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Brand activity */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Top Active Brands</h3>
              </div>
              <a href="/brands" className="text-xs text-primary hover:underline">Manage →</a>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex gap-3">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
                  </div>
                ))
              ) : stats?.brandActivity?.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No brand activity yet.
                </div>
              ) : (
                stats?.brandActivity?.map((b: any, i: number) => (
                  <div key={b.name} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-primary/20 w-20 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (b.count / (stats.brandActivity[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{b.count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
