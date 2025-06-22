import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { JWT } from "next-auth/jwt"

// 커스텀 에러 클래스 정의 (Context7 문서 참조)
class BackendConnectionError extends CredentialsSignin {
  code = "Backend connection failed"
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "Invalid email or password"
}

// 재시도 가능한 fetch 함수
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`백엔드 연결 시도 ${i + 1}/${maxRetries} 실패:`, error);
      
      if (i < maxRetries - 1) {
        // 지수 백오프: 1초, 2초, 4초
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError!;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // JWT 설정 제거 - NextAuth.js 기본 설정 사용
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email",
          placeholder: "your@email.com"
        },
        password: { 
          label: "Password", 
          type: "password",
          placeholder: "Your password"
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new InvalidCredentialsError();
        }

        try {
          // 환경에 따른 백엔드 URL 결정
          let backendUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';
          
          // 서버 사이드에서는 내부 URL 사용 (Docker 환경 등 고려)
          if (typeof window === 'undefined') {
            // 서버 사이드 환경변수 우선 사용
            backendUrl = process.env.MCP_API_URL || process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';
          }

          console.log('백엔드 연결 시도:', `${backendUrl}/api/users/login`);

          const response = await fetchWithRetry(`${backendUrl}/api/users/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new InvalidCredentialsError();
            }
            console.error('백엔드 응답 오류:', response.status, response.statusText);
            throw new BackendConnectionError();
          }

          const data = await response.json();
          console.log('로그인 성공:', { userId: data.user?.id, email: data.user?.email });
          
          return {
            id: data.user.id.toString(),
            email: data.user.email || '',
            name: data.user.name || '',
            teamId: data.organization?.id?.toString() || null,
            teamName: data.organization?.name || null,
            isAdmin: data.user.is_admin || false,
          }
        } catch (error) {
          console.error('로그인 오류 상세:', error);
          
          // 이미 CredentialsSignin 타입이면 그대로 던지기
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          
          // 네트워크 오류의 경우
          if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new BackendConnectionError();
          }
          
          // 기타 오류
          throw new BackendConnectionError();
        }
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // 로그인 성공 후 기본적으로 /projects로 리다이렉트
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/projects`
      }
      // 상대 경로인 경우 baseUrl과 결합
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      // 동일한 도메인인 경우
      if (new URL(url).origin === baseUrl) {
        return url
      }
      // 기본값으로 /projects
      return `${baseUrl}/projects`
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.teamId = (user as any).teamId
        token.teamName = (user as any).teamName
        token.isAdmin = (user as any).isAdmin
        
        // 디버깅을 위한 토큰 출력
        console.log('=== JWT Token Debug ===')
        console.log('User ID:', user.id)
        console.log('Team ID:', (user as any).teamId)
        console.log('Team Name:', (user as any).teamName)
        console.log('Is Admin:', (user as any).isAdmin)
        console.log('Full Token:', JSON.stringify(token, null, 2))
        console.log('========================')
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
        session.user.teamId = token.teamId as string
        session.user.teamName = token.teamName as string
        session.user.isAdmin = token.isAdmin as boolean
        
        // 세션 디버깅
        console.log('=== Session Debug ===')
        console.log('Session User ID:', session.user.id)
        console.log('Session Team ID:', session.user.teamId)
        console.log('Session Is Admin:', session.user.isAdmin)
        console.log('Full Session:', JSON.stringify(session, null, 2))
        console.log('====================')
      }
      return session
    }
  }
})
