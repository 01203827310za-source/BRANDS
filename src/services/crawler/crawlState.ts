export type CrawlProgress = {
  running: boolean;
  force: boolean;
  startedAt: string | null;
  currentBrand: string | null;
  brandsTotal: number;
  brandsCompleted: number;
  brandsRemaining: number;
  sourcesProcessed: number;
  itemsFound: number;
  newItems: number;
  duplicates: number;
  failedSources: number;
};

const IDLE: CrawlProgress = {
  running: false,
  force: false,
  startedAt: null,
  currentBrand: null,
  brandsTotal: 0,
  brandsCompleted: 0,
  brandsRemaining: 0,
  sourcesProcessed: 0,
  itemsFound: 0,
  newItems: 0,
  duplicates: 0,
  failedSources: 0,
};

class CrawlStateManager {
  private state: CrawlProgress = { ...IDLE };

  /**
   * Attempt to acquire the crawl lock.
   * Returns true if the lock was acquired; false if a crawl is already running.
   * Node.js single-threaded event loop guarantees this check-and-set is atomic
   * within a single process.
   */
  tryAcquire(brandsTotal: number, force: boolean): boolean {
    if (this.state.running) return false;
    this.state = {
      ...IDLE,
      running: true,
      force,
      startedAt: new Date().toISOString(),
      brandsTotal,
      brandsRemaining: brandsTotal,
    };
    return true;
  }

  release(): void {
    this.state = { ...IDLE };
  }

  /** No-op when not running — safe to call from standalone crawlBrand calls. */
  setBrand(name: string): void {
    if (!this.state.running) return;
    this.state.currentBrand = name;
  }

  /** No-op when not running. */
  completeBrand(): void {
    if (!this.state.running) return;
    this.state.brandsCompleted += 1;
    this.state.brandsRemaining = Math.max(0, this.state.brandsRemaining - 1);
    this.state.currentBrand = null;
  }

  /** No-op when not running. */
  recordSource(itemsFound: number, newCount: number, duplicateCount: number, failed: boolean): void {
    if (!this.state.running) return;
    this.state.sourcesProcessed += 1;
    this.state.itemsFound += itemsFound;
    this.state.newItems += newCount;
    this.state.duplicates += duplicateCount;
    if (failed) this.state.failedSources += 1;
  }

  isRunning(): boolean {
    return this.state.running;
  }

  get(): CrawlProgress {
    return { ...this.state };
  }
}

// Module-level singleton — shared across all requests in the same Node.js process.
export const crawlState = new CrawlStateManager();
