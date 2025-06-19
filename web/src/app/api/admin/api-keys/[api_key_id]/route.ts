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

    // 2. 동적 파라미터 처리 (Next.js 15+ 필수)
    const { api_key_id } = await params;

    // 3. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for API key detail');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for API key detail backend request');

    // 4. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/admin/api-keys/${api_key_id}`, {
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('API key detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = auth(async function PUT(req, { params }) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 동적 파라미터 처리 (Next.js 15+ 필수)
    const { api_key_id } = await params;

    // 3. 요청 본문 파싱
    const body = await req.json();

    // 4. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for API key update');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for API key update backend request');

    // 5. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/admin/api-keys/${api_key_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Backend API error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API key update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = auth(async function DELETE(req, { params }) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 동적 파라미터 처리 (Next.js 15+ 필수)
    const { api_key_id } = await params;

    // 3. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for API key delete');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for API key delete backend request');

    // 4. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/admin/api-keys/${api_key_id}`, {
      method: 'DELETE',
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('API key delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});