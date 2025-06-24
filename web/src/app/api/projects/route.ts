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

    // JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for backend request');

    const response = await fetch(`${BACKEND_URL}/api/projects`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = auth(async function POST(req) {
  try {
    console.log('🔍 POST /api/projects - Starting request processing');
    
    // NextAuth.js v5 방식: req.auth에서 세션 정보 가져오기
    if (!req.auth) {
      console.error('❌ No authentication found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authentication found:', { 
      userId: req.auth.user?.id, 
      email: req.auth.user?.email 
    });

    const body = await req.json();
    console.log('✅ Request body parsed:', body);

    // JWT 토큰 생성 (필수)
    console.log('🔍 Generating JWT token...');
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for POST');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ JWT token generated successfully');
    console.log('🔍 Backend URL:', BACKEND_URL);

    const response = await fetch(`${BACKEND_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    console.log('🔍 Backend response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Backend error response:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Project created successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Projects API error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
