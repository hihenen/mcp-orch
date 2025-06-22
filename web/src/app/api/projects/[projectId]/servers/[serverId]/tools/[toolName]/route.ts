import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const POST = auth(async function POST(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. URL에서 파라미터 추출
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[3]; // /api/projects/[projectId]/servers/[serverId]/tools/[toolName]
    const serverId = pathSegments[5];
    const toolName = pathSegments[7];

    if (!projectId || !serverId || !toolName) {
      return NextResponse.json({ 
        error: 'Missing projectId, serverId, or toolName' 
      }, { status: 400 });
    }

    // 3. 요청 본문에서 파라미터 추출
    const body = await req.json();
    const { arguments: toolArguments } = body;

    console.log(`🔧 Executing tool: ${toolName} with arguments:`, toolArguments);

    // 4. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for tool execution');
      return NextResponse.json({ 
        error: 'Failed to generate authentication token' 
      }, { status: 500 });
    }

    console.log('✅ Using JWT token for tool execution request');

    // 5. 백엔드 API 호출 - 도구 실행
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/servers/${serverId}/tools/${toolName}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        arguments: toolArguments || {}
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Tool execution failed (${response.status}):`, error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const result = await response.json();
    console.log(`✅ Tool execution successful:`, result);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Tool execution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});