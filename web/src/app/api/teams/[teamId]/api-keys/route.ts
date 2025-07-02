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

    // 2. URL에서 teamId 추출
    const url = new URL(req.url);
    const teamId = url.pathname.split('/')[3]; // /api/teams/[teamId]/api-keys
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // 3. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for team api-keys request');

    // 4. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}/api-keys`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Backend API error: ${response.status} - ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.length} api keys for team ${teamId}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Team api-keys API error:', error);
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

    // 2. URL에서 teamId 추출
    const url = new URL(req.url);
    const teamId = url.pathname.split('/')[3]; // /api/teams/[teamId]/api-keys
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // 3. 요청 본문 파싱
    const body = await req.json();

    // 4. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for POST');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for create team api-key request');

    // 5. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Backend API error: ${response.status} - ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully created api key: ${data.name} for team ${teamId}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Team api-key create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});