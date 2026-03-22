'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registering, setRegistering] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid email or password.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError('');
    setRegistering(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setRegisterError(data.error ?? 'Registration failed');
        return;
      }
      // Auto sign in after registration
      const result = await signIn('credentials', { email: email.trim(), password, redirect: false });
      if (result?.error) {
        setRegisterError('Registered but could not sign in. Please try signing in manually.');
      } else {
        router.push('/');
        router.refresh();
      }
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-emerald-700">SA Compliance</span>
          <p className="mt-1 text-sm text-slate-500">South African Financial Compliance</p>
        </div>

        {!showRegister ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    aria-label="Email address"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    aria-label="Password"
                  />
                </div>
                {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              <p className="mt-4 text-center text-xs text-slate-500">
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="text-emerald-600 hover:underline"
                >
                  Create first admin account
                </button>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create admin account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {registerError && <p className="text-sm text-red-600" role="alert">{registerError}</p>}
                <Button type="submit" disabled={registering} className="w-full">
                  {registering ? 'Creating...' : 'Create account'}
                </Button>
              </form>
              <p className="mt-4 text-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="text-emerald-600 hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
