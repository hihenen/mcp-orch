import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

interface RouteContext {
  params: {
    projectId: string;
    memberId: string;
  };
}

export const PUT = auth(async function PUT(
  req: NextRequest & { auth: any },
  { params }: RouteContext
) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for PUT member');
      return NextResponse.json(
        { error: 'Failed to generate authentication token' }, 
        { status: 500 }
      );
    }

    console.log('✅ Using JWT token for PUT member request');

    // 3. 요청 본문 파싱
    const body = await req.json();

    // 4. 백엔드 API 호출
    const response = await fetch(
      `${BACKEND_URL}/api/projects/${params.projectId}/members/${params.memberId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Backend error: ${response.status} - ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('PUT member API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = auth(async function DELETE(
  req: NextRequest & { auth: any },
  { params }: RouteContext
) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for DELETE member');
      return NextResponse.json(
        { error: 'Failed to generate authentication token' }, 
        { status: 500 }
      );
    }

    console.log('✅ Using JWT token for DELETE member request');

    // 3. 백엔드 API 호출
    const response = await fetch(
      `${BACKEND_URL}/api/projects/${params.projectId}/members/${params.memberId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Backend error: ${response.status} - ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    // DELETE는 보통 빈 응답이거나 status 메시지를 반환
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('DELETE member API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});