import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';

import Providers from '../components/Providers';
import SiteChrome from '../components/layout/SiteChrome';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Auctio — Live auctions & curated marketplace',
    template: '%s · Auctio',
  },
  description:
    'Bid in real-time auctions and shop verified sellers across India. Refundable caution deposits, anti-sniping protection and tracked delivery on every order.',
  keywords: ['auction', 'marketplace', 'bid', 'collectibles', 'buy', 'sell', 'India'],
  authors: [{ name: 'Auctio' }],
  creator: 'Auctio',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Auctio',
    title: 'Auctio — Live auctions & curated marketplace',
    description: 'Bid in real-time auctions and shop verified sellers across India.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auctio — Live auctions & curated marketplace',
    description: 'Bid in real-time auctions and shop verified sellers across India.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fafaf9',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`} data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-canvas text-ink font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
