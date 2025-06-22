import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req, { params }) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Next.js 15+ params 처리
    const { projectId } = await params;

    // 3. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for project activities request');

    // 4. 쿼리 파라미터 처리
    const url = new URL(req.url);
    const searchParams = new URLSearchParams();
    
    // 필터링 파라미터 전달
    const actionFilter = url.searchParams.get('action_filter');
    const severityFilter = url.searchParams.get('severity_filter');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';
    
    if (actionFilter) searchParams.set('action_filter', actionFilter);
    if (severityFilter) searchParams.set('severity_filter', severityFilter);
    searchParams.set('limit', limit);
    searchParams.set('offset', offset);

    // 5. 백엔드 API 호출
    const apiUrl = `${BACKEND_URL}/api/projects/${projectId}/activities/?${searchParams.toString()}`;
    console.log('🔗 Calling backend API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Backend API error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Successfully fetched project activities:', data.length, 'activities');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Project activities API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});