
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { getAllAppRoutes } from '@/lib/menu-config';

// Get all valid application paths from the roles configuration
const allAppRoutes = getAllAppRoutes();

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = await getSession();

  // Allow access to static files and Next.js internals
  if (path.startsWith('/_next/') || path.includes('/favicon.ico')) {
      return NextResponse.next();
  }
  
  // If trying to access login page while logged in, redirect to dashboard
  if (session && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // If trying to access any other page without a session, redirect to login
  if (!session && path !== '/login') {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  
  // If a session exists, perform permission checks for configured app routes
  if (session) {
    // Let them access the dashboard or root page (which redirects to dashboard)
    if (path === '/dashboard' || path === '/') {
        return NextResponse.next();
    }

    // Check if the requested path is a protected application route
    if (allAppRoutes.has(path)) {
      const userPermissions = session.permissions || [];
      // Deny access if user does not have permission for this specific route
      if (!userPermissions.includes(path)) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
      }
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
