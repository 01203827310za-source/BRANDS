// Type stubs for playwright / playwright-core.
// These packages are only installed inside the Docker image (Railway).
// The stubs let tsc compile locally without the packages being present.

interface PwLaunchOptions {
  executablePath?: string;
  headless?: boolean;
  args?: string[];
}

interface PwBrowserContextOptions {
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  extraHTTPHeaders?: Record<string, string>;
  viewport?: { width: number; height: number } | null;
}

interface PwRequest {
  resourceType(): string;
}

interface PwResponse {
  status(): number;
  url(): string;
  request(): PwRequest;
}

interface PwPage {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<PwResponse | null>;
  content(): Promise<string>;
  title(): Promise<string>;
  url(): string;
  addInitScript(script: () => void): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(options?: { type?: string; fullPage?: boolean }): Promise<Buffer>;
  on(event: 'response', handler: (response: PwResponse) => void): void;
}

interface PwBrowserContext {
  newPage(): Promise<PwPage>;
  close(): Promise<void>;
}

interface PwBrowser {
  newContext(options?: PwBrowserContextOptions): Promise<PwBrowserContext>;
  close(): Promise<void>;
}

interface PwBrowserType {
  launch(options?: PwLaunchOptions): Promise<PwBrowser>;
}

declare module 'playwright-core' {
  export const chromium: PwBrowserType;
}

declare module 'playwright' {
  export const chromium: PwBrowserType;
}
