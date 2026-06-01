import { NextRequest, NextResponse } from 'next/server';

// Middleware runs in Edge Runtime — only checks cookie presence.
// Full cryptographic verification happens in the Server Component (Node.js runtime).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
