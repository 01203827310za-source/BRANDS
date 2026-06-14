// Minimal type stub for playwright-core.
// The real package is only installed in the Docker build (Railway).
// This stub lets tsc compile locally without the package being present.
declare module 'playwright-core' {
  interface LaunchOptions {
    executablePath?: string;
    headless?: boolean;
    args?: string[];
  }

  interface BrowserContextOptions {
    userAgent?: string;
    locale?: string;
    extraHTTPHeaders?: Record<string, string>;
    viewport?: { width: number; height: number } | null;
  }

  interface PlaywrightRequest {
    resourceType(): string;
  }

  interface PlaywrightResponse {
    status(): number;
    url(): string;
    request(): PlaywrightRequest;
  }

  interface Page {
    goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<PlaywrightResponse | null>;
    content(): Promise<string>;
    url(): string;
    addInitScript(script: () => void): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
    on(event: 'response', handler: (response: PlaywrightResponse) => void): void;
  }

  interface BrowserContext {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  interface Browser {
    newContext(options?: BrowserContextOptions): Promise<BrowserContext>;
    close(): Promise<void>;
  }

  interface BrowserType {
    launch(options?: LaunchOptions): Promise<Browser>;
  }

  export const chromium: BrowserType;
}
