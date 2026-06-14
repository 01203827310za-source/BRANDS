import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
// Side-effect import: starts the scheduler exactly once inside the Node.js process.
// See src/lib/scheduler-bootstrap.ts for why this lives here and not in instrumentation.ts.
import '@/lib/scheduler-bootstrap';

export const metadata: Metadata = {
  title: 'Brand Monitor — Intelligence Platform',
  description: 'Monitor fashion and sportswear brands for new releases, drops, and collections.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
