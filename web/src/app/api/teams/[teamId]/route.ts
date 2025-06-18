import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req) {
  try {
    // NextAuth.js v5 방식: req.auth에서 세션 정보 가져오기
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL에서 teamId 추출
    const url = new URL(req.url);
    const teamId = url.pathname.split('/')[3]; // /api/teams/[teamId]
    
    console.log(`🔍 [TEAM_API] Getting team detail for teamId: ${teamId}`);

    // JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for backend request');

    const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    console.log(`🔍 [TEAM_API] Backend response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`🔍 [TEAM_API] Backend error: ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('🔍 [TEAM_API] Team data received:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Team detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = auth(async function PUT(req) {
  try {
    // NextAuth.js v5 방식: req.auth에서 세션 정보 가져오기
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL에서 teamId 추출
    const url = new URL(req.url);
    const teamId = url.pathname.split('/')[3]; // /api/teams/[teamId]
    
    const body = await req.json();
    console.log(`🔍 [TEAM_API] Updating team ${teamId} with data:`, body);

    // JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for PUT');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for PUT request');

    const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    console.log(`🔍 [TEAM_API] PUT response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`🔍 [TEAM_API] PUT error: ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('🔍 [TEAM_API] Team updated:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Team update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = auth(async function DELETE(req) {
  try {
    // NextAuth.js v5 방식: req.auth에서 세션 정보 가져오기
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL에서 teamId 추출
    const url = new URL(req.url);
    const teamId = url.pathname.split('/')[3]; // /api/teams/[teamId]
    
    console.log(`🔍 [TEAM_API] Deleting team ${teamId}`);

    // JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for DELETE');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for DELETE request');

    const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    console.log(`🔍 [TEAM_API] DELETE response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`🔍 [TEAM_API] DELETE error: ${error}`);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('🔍 [TEAM_API] Team deleted:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Team delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});