'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DiscoveryTypeBadge, SourceTypeBadge } from '@/components/discoveries/badges';
import { timeAgo, truncate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Search, Loader2, ExternalLink, RefreshCw, PlayCircle } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [running, setRunning] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q: query, pageSize: '50' });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.data || []);
    } catch {
      toast({ title: 'Search error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const triggerWebSearch = async () => {
    setRunning(true);
    await fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'search' }),
    });
    toast({ title: 'Web search started', description: 'Brand web searches running in the background.' });
    setTimeout(() => setRunning(false), 5000);
  };

  const QUICK_SEARCHES = [
    'new collection', 'limited drop', 'collaboration', 'restock', 'launch 2025', 'exclusive',
  ];

  return (
    <>
      <Header
        title="Search"
        description="Search across all discovered brands and products"
        actions={
          <Button variant="outline" size="sm" onClick={triggerWebSearch} disabled={running}>
            <PlayCircle className={`h-3.5 w-3.5 mr-1.5 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Running…' : 'Run Web Search'}
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search discoveries, products, collections…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 h-11"
              autoFocus
            />
          </div>
          <Button type="submit" className="h-11 px-5" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {/* Quick searches */}
        {!hasSearched && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Quick searches</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); setTimeout(() => document.querySelector('form')?.requestSubmit(), 50); }}
                  className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasSearched && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No results found for "{query}"</p>
            <p className="text-xs mt-1">Try a different search term or run a web search to fetch new data.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{results.length} results for "<strong className="text-foreground">{query}</strong>"</p>
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                  {r.imageUrls?.[0] && (
                    <img src={r.imageUrls[0]} alt={r.title} className="h-14 w-14 rounded-lg object-cover bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-foreground">{r.brand?.name}</span>
                      <DiscoveryTypeBadge type={r.discoveryType} />
                      <SourceTypeBadge type={r.sourceType} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{truncate(r.title, 80)}</p>
                    {(r.aiAnalysis?.summary || r.summary) && (
                      <p className="text-xs text-muted-foreground mt-1">{truncate(r.aiAnalysis?.summary || r.summary, 150)}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">{timeAgo(r.createdAt)}</p>
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
