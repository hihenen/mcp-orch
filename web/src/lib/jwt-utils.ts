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
    console.log('🔍 [JWT Debug] Starting JWT token generation process...');
    
    // 환경변수 검증
    const authSecret = process.env.AUTH_SECRET;
    console.log('🔍 [JWT Debug] AUTH_SECRET exists:', !!authSecret);
    console.log('🔍 [JWT Debug] AUTH_SECRET length:', authSecret?.length || 0);
    console.log('🔍 [JWT Debug] AUTH_SECRET prefix:', authSecret?.substring(0, 10) + '...' || 'undefined');
    
    // NextAuth.js 환경변수들도 확인
    console.log('🔍 [JWT Debug] NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
    console.log('🔍 [JWT Debug] NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    console.log('🔍 [JWT Debug] NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 [JWT Debug] AUTH_TRUST_HOST:', process.env.AUTH_TRUST_HOST);
    
    // 요청 헤더 확인
    console.log('🔍 [JWT Debug] Request URL:', request.url);
    console.log('🔍 [JWT Debug] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // NextAuth.js getToken 호출
    console.log('🔍 [JWT Debug] Calling NextAuth getToken...');
    
    // 운영환경에서 쿠키 도메인 문제 해결을 위한 옵션 추가
    const tokenOptions = { 
      req: request,
      secret: authSecret,
      // 운영환경에서 secureCookie 설정 명시적 처리
      secureCookie: process.env.NODE_ENV === 'production' && request.url?.startsWith('https://'),
      // 쿠키 이름 명시적 설정 (HTTPS 환경에서 __Secure- 접두사 처리)
      cookieName: process.env.NODE_ENV === 'production' && request.url?.startsWith('https://') 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token'
    };
    
    console.log('🔍 [JWT Debug] Token options:', tokenOptions);
    
    const token = await getToken(tokenOptions);

    console.log('🔍 [JWT Debug] NextAuth token result:', !!token);
    
    if (!token) {
      console.error('❌ [JWT Debug] NextAuth getToken returned null');
      console.log('🔍 [JWT Debug] Possible causes:');
      console.log('  - No valid session cookie found');
      console.log('  - AUTH_SECRET mismatch');
      console.log('  - Cookie domain/secure settings issue');
      console.log('  - Session expired');
      return null;
    }

    console.log('✅ [JWT Debug] NextAuth token found');
    console.log('🔍 [JWT Debug] Token keys:', Object.keys(token));
    console.log('🔍 [JWT Debug] Token sub:', token.sub);
    console.log('🔍 [JWT Debug] Token email:', token.email);
    console.log('🔍 [JWT Debug] Token name:', token.name);
    console.log('🔍 [JWT Debug] Token teamId:', token.teamId);
    console.log('🔍 [JWT Debug] Token teamName:', token.teamName);

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

    console.log('🔍 [JWT Debug] Creating JWT payload:', tokenPayload);

    // UTF-8 문자열을 안전하게 Base64로 인코딩
    const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "none" })).toString('base64');
    const payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const signature = "";

    const finalJwt = `${header}.${payload}.${signature}`;
    console.log('✅ [JWT Debug] JWT token generated successfully');
    console.log('🔍 [JWT Debug] JWT length:', finalJwt.length);
    console.log('🔍 [JWT Debug] JWT preview:', finalJwt.substring(0, 50) + '...');

    return finalJwt;
  } catch (error) {
    console.error('❌ [JWT Debug] Error in getServerJwtToken:', error);
    console.error('❌ [JWT Debug] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [JWT Debug] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ [JWT Debug] Error message:', error instanceof Error ? error.message : String(error));
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
