import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-slate-200">404</h1>
      <h2 className="text-xl font-semibold text-slate-800">Page not found</h2>
      <p className="text-slate-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
