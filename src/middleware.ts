import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;
  const token = request.cookies.get('wa_session')?.value;

  // 1. Static asset, API, or system route bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Standard App Routes that should NEVER be rewritten to custom domain /p/[slug]
  const isStandardRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/p/');

  // 3. Custom Domain & Top-Level Slug Routing (e.g. https://skybook.live/test -> /p/test)
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || host;
  const cleanHost = rawHost.toLowerCase().split(',')[0].trim().split(':')[0];
  let cleanMainHost = '';
  try {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      cleanMainHost = new URL(process.env.NEXT_PUBLIC_APP_URL).host.toLowerCase().split(':')[0];
    }
  } catch {
    cleanMainHost = '';
  }

  const isCustomDomain =
    Boolean(cleanHost) &&
    !cleanHost.includes('localhost') &&
    !cleanHost.includes('127.0.0.1') &&
    !cleanHost.endsWith('.vercel.app') &&
    (!cleanMainHost || cleanHost !== cleanMainHost);

  if (!isStandardRoute) {
    const slug = pathname.replace(/^\/+|\/+$/g, '');
    // Rewrite single-segment slug paths on custom domains (and top-level slugs on app domain) to /p/[slug]
    if (slug && !slug.includes('/') && (isCustomDomain || pathname.split('/').filter(Boolean).length === 1)) {
      const rewriteUrl = new URL(`/p/${slug}`, request.url);
      rewriteUrl.search = request.nextUrl.search;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // 4. Auth protected route checking
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAdminDashboardRoute = pathname.startsWith('/dashboard');

  if ((isSuperAdminRoute || isAdminDashboardRoute) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
