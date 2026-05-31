import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from './context/SessionContext';
import { SidebarProvider } from './context/SidebarContext';
import LayoutShell from './components/LayoutShell';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Creator Lens — AI Video Comparison',
  description:
    'Compare two social-media videos side-by-side using AI-powered analysis. Get instant engagement insights, transcript analysis, and creator benchmarking.',
  keywords: ['video analytics', 'YouTube', 'Instagram', 'AI', 'engagement rate', 'creator tools'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body
        className="min-h-full antialiased"
        style={{ background: '#0a0f1e', color: '#f9fafb' }}
      >
        <SessionProvider>
          <SidebarProvider>
            <LayoutShell>{children}</LayoutShell>
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
