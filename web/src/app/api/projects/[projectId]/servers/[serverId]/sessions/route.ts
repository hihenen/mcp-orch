import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

interface ClientSessionData {
  id: string;
  client_type: string;
  client_version?: string;
  server_id: string;
  project_id: string;
  connected_at: string;
  last_activity: string;
  disconnected_at?: string;
  is_active: boolean;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  metadata?: any;
  user_agent?: string;
  ip_address?: string;
}

// GET /api/projects/[projectId]/servers/[serverId]/sessions
export const GET = auth(async function GET(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for backend request');

    // URL에서 파라미터 추출
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[3]; // /api/projects/[projectId]/...
    const serverId = pathSegments[5]; // /api/projects/[projectId]/servers/[serverId]/...

    const { searchParams } = url;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activeOnly = searchParams.get('active_only') === 'true';

    // 3. 백엔드 API 호출
    const response = await fetch(
      `${BACKEND_URL}/api/projects/${projectId}/servers/${serverId}/sessions?limit=${limit}&offset=${offset}&active_only=${activeOnly}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/projects/[projectId]/servers/[serverId]/sessions
export const POST = auth(async function POST(req) {
  try {
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for POST');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    // URL에서 파라미터 추출
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[3];
    const serverId = pathSegments[5];

    // 클라이언트 정보 추출
    const clientInfo = {
      client_type: body.client_type || 'unknown',
      client_version: body.client_version,
      server_id: serverId,
      project_id: projectId,
      metadata: body.metadata,
      user_agent: req.headers.get('user-agent'),
      ip_address: req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown'
    };

    const response = await fetch(
      `${BACKEND_URL}/api/projects/${projectId}/servers/${serverId}/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(clientInfo),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
