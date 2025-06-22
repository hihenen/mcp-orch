import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // NextAuth 세션 확인
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL 쿼리 파라미터 전달
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/servers/${queryString ? `?${queryString}` : ''}`;

    // 백엔드로 요청 전달
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // NextAuth 세션의 사용자 정보를 헤더로 전달
        'X-User-Id': session.user.id,
        'X-User-Email': session.user.email || '',
        // 한글 이름을 Base64로 인코딩하여 전달
        'X-User-Name': session.user.name ? Buffer.from(session.user.name, 'utf8').toString('base64') : '',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Servers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // NextAuth 세션 확인
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // 백엔드로 요청 전달
    const response = await fetch(`${BACKEND_URL}/api/servers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NextAuth 세션의 사용자 정보를 헤더로 전달
        'X-User-Id': session.user.id,
        'X-User-Email': session.user.email || '',
        // 한글 이름을 Base64로 인코딩하여 전달
        'X-User-Name': session.user.name ? Buffer.from(session.user.name, 'utf8').toString('base64') : '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Servers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
