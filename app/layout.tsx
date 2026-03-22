import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '@/app/components/layout/Nav';
import { Providers } from '@/app/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'South African Financial Compliance | Audit Readiness',
  description: 'Assess financial compliance and audit readiness for South African companies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-slate-50">
            <Nav />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
