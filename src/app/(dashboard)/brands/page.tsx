'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeAgo, cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Search, RefreshCw, Edit2, Trash2, Power,
  Globe, Instagram, ExternalLink, Tag, MoreVertical, PlayCircle
} from 'lucide-react';
import BrandDialog from './brand-dialog';

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<any>(null);
  const [crawlingId, setCrawlingId] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', search });
      const res = await fetch(`/api/brands?${params}`);
      const data = await res.json();
      setBrands(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast({ title: 'Error loading brands', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const toggleActive = async (brand: any) => {
    try {
      await fetch(`/api/brands/${brand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !brand.isActive }),
      });
      fetchBrands();
      toast({ title: brand.isActive ? 'Brand disabled' : 'Brand enabled' });
    } catch {
      toast({ title: 'Error updating brand', variant: 'destructive' });
    }
  };

  const deleteBrand = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/brands/${id}`, { method: 'DELETE' });
      fetchBrands();
      toast({ title: `${name} deleted` });
    } catch {
      toast({ title: 'Error deleting brand', variant: 'destructive' });
    }
  };

  const triggerCrawl = async (id: string, name: string) => {
    setCrawlingId(id);
    try {
      await fetch(`/api/brands/${id}/crawl`, { method: 'POST' });
      toast({ title: `Crawling ${name}…`, description: 'Results will appear shortly.' });
    } catch {
      toast({ title: 'Error starting crawl', variant: 'destructive' });
    } finally {
      setTimeout(() => setCrawlingId(null), 5000);
    }
  };

  const priorityColor: Record<string, string> = {
    HIGH: 'bg-red-50 text-red-700 border-red-100',
    MEDIUM: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    LOW: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <>
      <Header
        title="Brands"
        description={`Monitoring ${total} brands`}
        actions={
          <Button size="sm" onClick={() => { setEditBrand(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Brand
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search brands…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchBrands}>
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
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Products</th>
                  <th className="px-4 py-3 text-right">Discoveries</th>
                  <th className="px-4 py-3 text-left">Last Crawl</th>
                  <th className="px-4 py-3 text-left">Sources</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(9).fill(0).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : brands.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No brands found. Add your first brand to start monitoring.</p>
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{brand.name}</p>
                          <p className="text-xs text-muted-foreground">{brand.country || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{brand.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', priorityColor[brand.priority])}>
                          {brand.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('status-dot', brand.isActive ? 'active' : 'inactive')} />
                          <span className="text-xs text-muted-foreground">{brand.isActive ? 'Active' : 'Paused'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium tabular-nums">{brand._count?.products ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium tabular-nums">{brand._count?.discoveries ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{timeAgo(brand.lastCrawledAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {brand.websiteUrl && <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer"><Globe className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" /></a>}
                          {brand.instagramUrl && <a href={brand.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram className="h-3.5 w-3.5 text-muted-foreground hover:text-pink-500" /></a>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => triggerCrawl(brand.id, brand.name)} disabled={crawlingId === brand.id} title="Run crawl">
                            <PlayCircle className={cn('h-3.5 w-3.5', crawlingId === brand.id ? 'animate-pulse text-primary' : 'text-muted-foreground')} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditBrand(brand); setDialogOpen(true); }} title="Edit">
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(brand)} title={brand.isActive ? 'Disable' : 'Enable'}>
                            <Power className={cn('h-3.5 w-3.5', brand.isActive ? 'text-green-600' : 'text-muted-foreground')} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteBrand(brand.id, brand.name)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BrandDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditBrand(null); }}
        onSave={fetchBrands}
        brand={editBrand}
      />
    </>
  );
}
