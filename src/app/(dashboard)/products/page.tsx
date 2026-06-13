'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeAgo, truncate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw, ExternalLink, Package, Download } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/brands?pageSize=100').then(r => r.json()).then(d => setBrands(d.data || []));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '25', search,
        ...(brandFilter && { brandId: brandFilter }),
      });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'Error loading products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, brandFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const exportCSV = () => {
    const params = new URLSearchParams({ type: 'products', format: 'csv', ...(brandFilter && { brandId: brandFilter }) });
    window.open(`/api/export?${params}`, '_blank');
  };

  return (
    <>
      <Header
        title="Products"
        description={`${total} products tracked`}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left">Image</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Color</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Collection</th>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left">Found</th>
                  <th className="px-4 py-3 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(10).fill(0).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>))}</tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No products found yet. Run a crawl to discover products.</p>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {p.imageUrls?.[0] ? (
                          <img src={p.imageUrls[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover bg-muted" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground max-w-[180px]">{truncate(p.name, 55)}</p>
                        {p.gender && <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{p.gender.toLowerCase()}</p>}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{p.brand?.name}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{p.category || '—'}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{p.color || '—'}</span></td>
                      <td className="px-4 py-3">
                        {p.price ? (
                          <div>
                            {p.salePrice && p.salePrice < p.price ? (
                              <>
                                <span className="text-xs font-semibold text-green-700">{p.currency || '$'}{p.salePrice}</span>
                                <span className="text-[10px] text-muted-foreground line-through ml-1">{p.price}</span>
                              </>
                            ) : (
                              <span className="text-xs font-medium">{p.currency || '$'}{p.price}</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{truncate(p.collectionName || '—', 30)}</span></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${p.isInStock ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.isInStock ? 'bg-green-500' : 'bg-red-400'}`} />
                          {p.isInStock ? 'In Stock' : 'Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span></td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                        </Button>
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
