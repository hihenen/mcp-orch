import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organizationName } = await request.json()

    // 입력 검증
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // FastAPI 백엔드로 회원가입 요청
    const backendUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/users/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
        organization_name: organizationName
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.detail || '회원가입에 실패했습니다.' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('회원가입 오류:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
