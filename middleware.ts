import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiter for the upload endpoint (10 requests per minute per IP)
// Note: This is per-process memory — does not persist across restarts or multiple processes.
// For production with multiple instances, use Redis (e.g., @upstash/ratelimit).
const uploadRateLimit = new Map<string, { count: number; resetAt: number }>();
const UPLOAD_LIMIT = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = uploadRateLimit.get(ip);
  if (!record || now > record.resetAt) {
    uploadRateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= UPLOAD_LIMIT) return false;
  record.count++;
  return true;
}

export default withAuth(
  function middleware(req: NextRequest) {
    if (req.nextUrl.pathname.startsWith('/api/trial-balance/upload')) {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        '127.0.0.1';

      if (!checkRateLimit(ip)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait before uploading again.' },
          { status: 429 }
        );
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Protect all routes except auth routes, static files, and sign-in page
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in).*)',
  ],
};
