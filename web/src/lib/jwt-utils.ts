import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

/**
 * NextAuth.js JWT 토큰에서 실제 JWT 문자열을 추출합니다.
 * 클라이언트 사이드에서 사용할 수 있는 함수입니다.
 */
export async function getJwtToken(): Promise<string | null> {
  try {
    // 클라이언트 사이드에서는 쿠키에서 직접 토큰을 가져와야 합니다
    if (typeof window === 'undefined') {
      return null; // 서버 사이드에서는 사용하지 않음
    }

    // NextAuth.js 세션 토큰 쿠키 이름 (기본값)
    const cookieName = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
      ? 'next-auth.session-token' 
      : '__Secure-next-auth.session-token';

    // 쿠키에서 세션 토큰 가져오기
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${cookieName}=`)
    );

    if (!sessionCookie) {
      console.log('❌ NextAuth session cookie not found');
      return null;
    }

    const sessionToken = sessionCookie.split('=')[1];
    console.log('✅ NextAuth session token found:', sessionToken.substring(0, 20) + '...');

    // 세션 토큰을 사용하여 JWT 토큰 가져오기
    // 이는 NextAuth.js 내부 API를 사용하는 방법입니다
    const response = await fetch('/api/auth/session');
    const session = await response.json();

    if (session?.user) {
      // NextAuth.js v5에서는 JWT 토큰이 직접 노출되지 않으므로
      // 백엔드에서 사용할 수 있는 형태로 토큰을 생성해야 합니다
      
      // 임시로 세션 정보를 기반으로 간단한 토큰 생성
      // 실제로는 백엔드에서 JWT를 생성하거나 NextAuth.js JWT를 직접 사용해야 합니다
      const tokenPayload = {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        teamId: session.user.teamId,
        teamName: session.user.teamName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간
      };

      // Base64 인코딩된 JWT 형태로 반환 (실제 JWT는 아니지만 호환 가능)
      // UTF-8 문자열을 안전하게 Base64로 인코딩 (브라우저 환경)
      const header = btoa(unescape(encodeURIComponent(JSON.stringify({ typ: "JWT", alg: "none" }))));
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify(tokenPayload))));
      const signature = ""; // 서명 없음 (개발용)

      const jwt = `${header}.${payload}.${signature}`;
      console.log('✅ Generated JWT token:', jwt.substring(0, 50) + '...');
      return jwt;
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting JWT token:', error);
    return null;
  }
}

/**
 * 서버 사이드에서 NextAuth.js JWT 토큰을 추출합니다.
 */
export async function getServerJwtToken(request: NextRequest): Promise<string | null> {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.AUTH_SECRET 
    });

    if (!token) {
      return null;
    }

    // NextAuth.js 토큰을 백엔드 호환 JWT 형태로 변환
    const tokenPayload = {
      sub: token.sub,
      email: token.email,
      name: token.name,
      teamId: token.teamId,
      teamName: token.teamName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };

    // UTF-8 문자열을 안전하게 Base64로 인코딩
    const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "none" })).toString('base64');
    const payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const signature = "";

    return `${header}.${payload}.${signature}`;
  } catch (error) {
    console.error('❌ Error getting server JWT token:', error);
    return null;
  }
}

/**
 * JWT 토큰을 디코딩하여 페이로드를 반환합니다.
 */
export function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('❌ Error decoding JWT payload:', error);
    return null;
  }
}

/**
 * JWT 토큰이 만료되었는지 확인합니다.
 */
export function isJwtExpired(token: string): boolean {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
}
