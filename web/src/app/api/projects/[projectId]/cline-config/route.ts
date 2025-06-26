import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

// 프로젝트별 MCP 설정 파일 생성 및 다운로드 (Claude, Cursor 등)
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

    // 3. URL에서 projectId 추출
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[pathSegments.indexOf('projects') + 1];

    // 4. URL 파라미터 확인 (unified, download)
    const unified = url.searchParams.get('unified') === 'true';
    const download = url.searchParams.get('download') === 'true';

    // 5. 백엔드 API 호출 (unified 파라미터 전달)
    const backendUrl = new URL(`${BACKEND_URL}/projects/${projectId}/cline-config`);
    if (unified) {
      backendUrl.searchParams.set('unified', 'true');
    }

    const response = await fetch(backendUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const configData = await response.json();

    if (download) {
      // 파일 다운로드로 응답
      const configJson = JSON.stringify(configData.config, null, 2);
      const fileName = `${configData.project_name || 'project'}-mcp-settings.json`;
      
      return new NextResponse(configJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    } else {
      // JSON 데이터로 응답
      return NextResponse.json(configData);
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
