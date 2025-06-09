import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req: NextRequest & { auth: any }) => {
  // 인증된 사용자만 접근 가능한 경로들
  const protectedPaths = [
    '/dashboard',
    '/servers',
    '/tools',
    '/logs',
    '/config'
  ]

  // 공개 경로들 (인증 불필요)
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/api/auth',
    '/en',
    '/ko'
  ]

  const pathname = req.nextUrl.pathname

  // 공개 경로는 항상 허용
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 보호된 경로인지 확인
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  )

  // 보호된 경로이지만 인증되지 않은 경우 로그인 페이지로 리다이렉트
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
