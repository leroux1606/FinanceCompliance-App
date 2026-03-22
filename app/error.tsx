'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <span className="text-2xl">⚠</span>
      </div>
      <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-600">
        {error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
