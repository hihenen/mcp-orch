import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

// 비밀번호 변경
export const PUT = auth(async function PUT(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 요청 데이터 파싱
    const body = await req.json();
    
    // 3. 기본 유효성 검증
    const { currentPassword, newPassword, confirmPassword } = body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: '새 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 4. JWT 토큰 생성
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for password change');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for password change request');

    // 5. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/profile/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Password change API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});