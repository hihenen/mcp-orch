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

    console.log('✅ Using JWT token for project activities summary request');

    // 4. 백엔드 API 호출
    const apiUrl = `${BACKEND_URL}/api/projects/${projectId}/activities/summary`;
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
    console.log('✅ Successfully fetched project activities summary:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Project activities summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});