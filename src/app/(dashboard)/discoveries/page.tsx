'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DiscoveryTypeBadge, SourceTypeBadge, ConfidenceBar } from '@/components/discoveries/badges';
import { timeAgo, truncate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw, ExternalLink, Bell, Download, Filter } from 'lucide-react';

export default function DiscoveriesPage() {
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/brands?pageSize=100').then(r => r.json()).then(d => setBrands(d.data || []));
  }, []);

  const fetchDiscoveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '25', search,
        ...(typeFilter && { type: typeFilter }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(brandFilter && { brandId: brandFilter }),
      });
      const res = await fetch(`/api/discoveries?${params}`);
      const data = await res.json();
      setDiscoveries(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'Error loading discoveries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, sourceFilter, brandFilter]);

  useEffect(() => { fetchDiscoveries(); }, [fetchDiscoveries]);

  const exportCSV = () => {
    const params = new URLSearchParams({ type: 'discoveries', format: 'csv', ...(brandFilter && { brandId: brandFilter }) });
    window.open(`/api/export?${params}`, '_blank');
  };

  const retryNotification = async (discoveryId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoveryId, action: 'retry' }),
      });
      toast({ title: 'Notification queued' });
      fetchDiscoveries();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const TYPES = ['NEW_PRODUCT', 'NEW_COLLECTION', 'LIMITED_DROP', 'RESTOCK', 'PROMOTION', 'NEWS', 'OTHER'];
  const SOURCES = ['WEBSITE', 'NEW_ARRIVALS', 'COLLECTIONS', 'INSTAGRAM', 'WEB_SEARCH'];

  return (
    <>
      <Header
        title="Discoveries"
        description={`${total} items discovered`}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search discoveries…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchDiscoveries}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Confidence</th>
                  <th className="px-4 py-3 text-left">Summary</th>
                  <th className="px-4 py-3 text-left">Notified</th>
                  <th className="px-4 py-3 text-left">Detected</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(9).fill(0).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>))}</tr>
                  ))
                ) : discoveries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <p className="text-sm">No discoveries found. Run a crawl to detect new products.</p>
                    </td>
                  </tr>
                ) : (
                  discoveries.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold">{d.brand?.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground max-w-[200px]">{truncate(d.title, 60)}</p>
                        {d.aiAnalysis?.productName && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{d.aiAnalysis.productName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><DiscoveryTypeBadge type={d.discoveryType} /></td>
                      <td className="px-4 py-3"><SourceTypeBadge type={d.sourceType} /></td>
                      <td className="px-4 py-3"><ConfidenceBar value={d.confidenceScore} /></td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground max-w-[200px]">{truncate(d.aiAnalysis?.summary || d.summary || '—', 80)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {d.isNotified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            Not sent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {d.url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={d.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
                            </Button>
                          )}
                          {!d.isNotified && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => retryNotification(d.id)} title="Send notification">
                              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
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
              <span className="text-xs text-muted-foreground">Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
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
