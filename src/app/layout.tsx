import type { Metadata, Viewport } from 'next';
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JustCook • Tactile Kitchen & Recipe Matcher',
  description: 'An interactive, tactile kitchen companion to cook with what you have and prevent food waste.',
  manifest: '/manifest.json',
  icons: {
    icon: '/app-icon.svg',
    apple: '/app-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JustCook',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#faf8f5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plusJakarta.variable}`}>
      <body className="font-sans bg-[#faf8f5] text-[#201b16] min-h-screen antialiased selection:bg-[#f6dfd6] selection:text-[#9e3a19]">
        {children}
      </body>
    </html>
  );
}
