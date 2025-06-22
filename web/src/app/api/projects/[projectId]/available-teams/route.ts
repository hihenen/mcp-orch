import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

// 초대 가능한 팀 목록 조회
export const GET = auth(async function GET(req, { params }) {
  try {
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for available teams');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log(`✅ Getting available teams for project ${projectId}`);

    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/available-teams`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Available teams fetch failed:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Available teams fetch successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Available teams API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});