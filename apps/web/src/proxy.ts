import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/sessionCookie';

/* An optimistic gate: no cookie, no page. It never touches the database, since
   it runs on every request including prefetches -- whether the cookie is still
   good is decided by the (private) layout.

   Deliberately no redirect the other way. A stale cookie would bounce between
   /login and / forever, so the login page makes that call with the real check. */
export const proxy = (request: NextRequest) =>
  request.cookies.has(SESSION_COOKIE) || request.nextUrl.pathname === '/login'
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', request.url));

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
