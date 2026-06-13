'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { timeAgo, cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, PlayCircle, Terminal, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function LogsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [crawling, setCrawling] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      const res = await fetch(`/api/crawl?${params}`);
      const data = await res.json();
      setJobs(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const triggerCrawl = async () => {
    setCrawling(true);
    await fetch('/api/crawl', { method: 'POST', body: JSON.stringify({ type: 'crawl' }), headers: { 'Content-Type': 'application/json' } });
    toast({ title: 'Crawl started', description: 'Check logs below for progress.' });
    setTimeout(() => { setCrawling(false); fetchJobs(); }, 5000);
  };

  const statusIcon: Record<string, React.ReactNode> = {
    COMPLETED: <CheckCircle className="h-4 w-4 text-green-500" />,
    FAILED: <XCircle className="h-4 w-4 text-red-500" />,
    RUNNING: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
    PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
  };

  const statusColor: Record<string, string> = {
    COMPLETED: 'text-green-700 bg-green-50',
    FAILED: 'text-red-700 bg-red-50',
    RUNNING: 'text-blue-700 bg-blue-50',
    PENDING: 'text-yellow-700 bg-yellow-50',
  };

  return (
    <>
      <Header
        title="Crawler Logs"
        description={`${total} crawl jobs recorded`}
        actions={
          <Button size="sm" onClick={triggerCrawl} disabled={crawling} variant="outline">
            <PlayCircle className={`h-3.5 w-3.5 mr-1.5 ${crawling ? 'animate-pulse' : ''}`} />
            {crawling ? 'Running…' : 'Run Now'}
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Job list */}
          <div className="lg:col-span-1 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Recent Jobs</h3>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {loading ? (
                Array(6).fill(0).map((_, i) => <div key={i} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></div>)
              ) : jobs.map((job) => (
                <div
                  key={job.id}
                  className={cn('px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors', selectedJob?.id === job.id && 'bg-muted/40')}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {statusIcon[job.status] || statusIcon.PENDING}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{job.brand?.name || 'All Brands'}</p>
                        <p className="text-[10px] text-muted-foreground">{job.jobType.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{timeAgo(job.createdAt)}</p>
                      {job.itemsNew > 0 && <span className="text-[10px] text-green-600 font-medium">+{job.itemsNew}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job detail */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            {selectedJob ? (
              <>
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon[selectedJob.status]}
                      <div>
                        <h3 className="text-sm font-semibold">{selectedJob.brand?.name || 'All Brands'} — {selectedJob.jobType.replace('_', ' ')}</h3>
                        <p className="text-xs text-muted-foreground">{selectedJob.sourceUrl}</p>
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', statusColor[selectedJob.status])}>
                      {selectedJob.status}
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Items Found', value: selectedJob.itemsFound },
                      { label: 'New Items', value: selectedJob.itemsNew },
                      { label: 'Duration', value: selectedJob.completedAt ? `${Math.round((new Date(selectedJob.completedAt).getTime() - new Date(selectedJob.startedAt || selectedJob.createdAt).getTime()) / 1000)}s` : '—' },
                    ].map(s => (
                      <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {selectedJob.error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                      <strong>Error:</strong> {selectedJob.error}
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Log Entries</h4>
                    <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-1 max-h-72 overflow-y-auto">
                      {selectedJob.logs?.length === 0 ? (
                        <p className="text-slate-500">No logs available</p>
                      ) : selectedJob.logs?.map((log: any, i: number) => (
                        <div key={i} className={cn(
                          log.level === 'ERROR' ? 'text-red-400' :
                          log.level === 'WARN' ? 'text-yellow-400' :
                          'text-slate-300'
                        )}>
                          <span className="text-slate-500">[{new Date(log.createdAt).toISOString().split('T')[1].substring(0, 8)}]</span>
                          {' '}{log.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Terminal className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">Select a job to view details</p>
              </div>
            )}
          </div>
        </div>

        {total > 20 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{total} total jobs</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
