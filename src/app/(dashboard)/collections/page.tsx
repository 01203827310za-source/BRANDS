'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeAgo, formatDate, truncate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw, ExternalLink, Archive } from 'lucide-react';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/brands?pageSize=100').then(r => r.json()).then(d => setBrands(d.data || []));
  }, []);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '24', search,
        ...(brandFilter && { brandId: brandFilter }),
      });
      const res = await fetch(`/api/collections?${params}`);
      const data = await res.json();
      setCollections(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'Error loading collections', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, brandFilter]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  return (
    <>
      <Header title="Collections" description={`${total} collections tracked`} />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search collections…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchCollections}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="h-36 bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Archive className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No collections found yet.</p>
            <p className="text-xs mt-1">Collections are detected automatically from brand pages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {collections.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow group">
                {/* Image */}
                <div className="relative h-36 bg-muted overflow-hidden">
                  {c.imageUrls?.[0] ? (
                    <img src={c.imageUrls[0]} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Archive className="h-8 w-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  {/* Brand badge */}
                  <div className="absolute bottom-2 left-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                      {c.brand?.name}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <h3 className="text-xs font-semibold text-foreground leading-tight">{truncate(c.name, 50)}</h3>
                  {c.description && <p className="text-[11px] text-muted-foreground">{truncate(c.description, 70)}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {c.launchDate && (
                        <p className="text-[10px] text-muted-foreground">Launch: {formatDate(c.launchDate)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</p>
                    </div>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 24 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{total} total collections</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 24 >= total}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
