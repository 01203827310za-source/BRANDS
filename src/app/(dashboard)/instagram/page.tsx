'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DiscoveryTypeBadge } from '@/components/discoveries/badges';
import { timeAgo, truncate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw, ExternalLink, Instagram, Image as ImageIcon } from 'lucide-react';

export default function InstagramPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/brands?pageSize=100').then(r => r.json()).then(d => setBrands(d.data || []));
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), pageSize: '24', search,
        ...(brandFilter && { brandId: brandFilter }),
      });
      const res = await fetch(`/api/instagram?${params}`);
      const data = await res.json();
      setPosts(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'Error loading posts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, brandFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <>
      <Header title="Instagram" description={`${total} posts monitored`} />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search captions…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchPosts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Instagram className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No Instagram posts yet.</p>
            <p className="text-xs mt-1 text-center max-w-xs">Add Instagram handles to your brands and run a crawl to start monitoring posts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow group">
                {/* Media */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {post.mediaUrls?.[0] ? (
                    <img src={post.mediaUrls[0]} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  {post.mediaUrls?.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      +{post.mediaUrls.length - 1}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
                      <Instagram className="h-2.5 w-2.5" />
                      {post.brand?.name}
                    </span>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-3 space-y-1.5">
                  {post.isProductRelated && (
                    <DiscoveryTypeBadge type={post.detectedType || 'NEW_PRODUCT'} />
                  )}
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{truncate(post.caption || 'No caption', 100)}</p>
                  {post.hashtags?.length > 0 && (
                    <p className="text-[10px] text-primary/70">{post.hashtags.slice(0, 4).join(' ')}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(post.postedAt || post.createdAt)}</span>
                    {post.postUrl && (
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
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
            <span className="text-xs text-muted-foreground">{total} posts</span>
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
