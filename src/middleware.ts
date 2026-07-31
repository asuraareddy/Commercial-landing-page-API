import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;
  const token = request.cookies.get('wa_session')?.value;

  // 1. Static asset or API bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Custom Domain Routing (e.g. go.client.com)
  const mainDomain = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : 'localhost:3000';
  const cleanHost = host.split(':')[0];
  const cleanMainHost = mainDomain.split(':')[0];

  if (cleanHost !== cleanMainHost && !cleanHost.includes('localhost') && !cleanHost.includes('vercel.app')) {
    // Rewrite host to public landing page router or custom domain handler
    return NextResponse.rewrite(new URL(`/p/${pathname.replace('/', '')}`, request.url));
  }

  // 3. Auth protected route checking
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
