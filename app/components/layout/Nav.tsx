'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { clsx } from 'clsx';
import { Menu, X, LogOut, User } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/companies', label: 'Companies' },
  { href: '/admin', label: 'Admin' },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-emerald-700">SA Compliance</span>
          <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 sm:inline">
            South Africa
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'page' : undefined}
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
          {session?.user && (
            <div className="ml-4 flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <User className="h-3 w-3" />
                {session.user.name ?? session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/sign-in' })}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 sm:hidden">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'page' : undefined}
              className={clsx(
                'block rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {label}
            </Link>
          ))}
          {session?.user && (
            <>
              <div className="mt-2 border-t border-slate-100 pt-3">
                <p className="px-4 py-1 text-xs text-slate-500">
                  {session.user.name ?? session.user.email}
                </p>
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/sign-in' }); }}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
