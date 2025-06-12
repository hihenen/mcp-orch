import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. URL에서 파라미터 추출
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[3]; // /api/projects/[projectId]/servers/[serverId]/tools
    const serverId = pathSegments[5];

    if (!projectId || !serverId) {
      return NextResponse.json({ error: 'Missing projectId or serverId' }, { status: 400 });
    }

    // 3. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for backend request');

    // 4. 백엔드 API 호출 - 서버 상세 정보 조회 (도구 목록 포함)
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/servers/${serverId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const serverData = await response.json();
    
    // 5. 도구 목록만 추출해서 반환
    const tools = serverData.tools || [];
    
    return NextResponse.json({
      tools,
      tools_count: tools.length,
      server_status: serverData.status,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = auth(async function POST(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. URL에서 파라미터 추출
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[3];
    const serverId = pathSegments[5];

    if (!projectId || !serverId) {
      return NextResponse.json({ error: 'Missing projectId or serverId' }, { status: 400 });
    }

    // 3. JWT 토큰 생성
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for POST');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    // 4. 서버 상태 새로고침 요청
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/servers/${serverId}/refresh-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const refreshResult = await response.json();
    
    return NextResponse.json({
      message: 'Tools refreshed successfully',
      tools: refreshResult.tools || [],
      tools_count: refreshResult.tools ? refreshResult.tools.length : 0,
      server_status: refreshResult.status,
      refreshed_at: refreshResult.refreshed_at
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
