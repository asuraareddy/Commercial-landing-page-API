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
    pathname.startsWith('/p/');

  // 3. Custom Domain Routing (e.g. go.client.com/slug)
  const mainDomain = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : '';
  const cleanHost = host.split(':')[0];
  const cleanMainHost = mainDomain ? mainDomain.split(':')[0] : '';

  // Only rewrite to /p/[slug] if it's a custom domain AND NOT a standard app route
  if (
    !isStandardRoute &&
    cleanMainHost &&
    cleanHost !== cleanMainHost &&
    !cleanHost.includes('localhost') &&
    !cleanHost.includes('vercel.app')
  ) {
    const slug = pathname.replace('/', '');
    if (slug) {
      return NextResponse.rewrite(new URL(`/p/${slug}`, request.url));
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
