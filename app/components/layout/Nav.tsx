'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Companies' },
  { href: '/admin', label: 'Admin' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-emerald-700">SA Compliance</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">South Africa</span>
        </Link>
        <div className="flex gap-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
