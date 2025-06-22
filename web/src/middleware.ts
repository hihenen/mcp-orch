import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req: NextRequest & { auth: any }) => {
  // Paths that require authenticated users only
  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/servers',
    '/tools',
    '/logs',
    '/config',
    '/admin'
  ]

  // Public paths (no authentication required)
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/api/auth',
    '/en',
    '/ko'
  ]

  const pathname = req.nextUrl.pathname

  // Always allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if it's a protected path
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  )

  // Redirect to login page if accessing protected path without authentication
  if (isProtectedPath && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
