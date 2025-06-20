import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

// GET /api/projects/[projectId]/favorites - 즐겨찾기 목록 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await context.params
    const { searchParams } = new URL(request.url)
    const favoriteType = searchParams.get('favorite_type')

    // 백엔드 API 호출
    const backendUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000'
    let url = `${backendUrl}/api/projects/${projectId}/favorites`
    
    if (favoriteType) {
      url += `?favorite_type=${favoriteType}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch favorites' },
        { status: response.status }
      )
    }

    const favorites = await response.json()
    return NextResponse.json(favorites)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[projectId]/favorites - 즐겨찾기 추가
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await context.params
    const body = await request.json()

    // 백엔드 API 호출
    const backendUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/projects/${projectId}/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to add favorite' },
        { status: response.status }
      )
    }

    const favorite = await response.json()
    return NextResponse.json(favorite)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId]/favorites - 즐겨찾기 제거 (쿼리 파라미터로)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await context.params
    const { searchParams } = new URL(request.url)
    const favoriteType = searchParams.get('favorite_type')
    const targetId = searchParams.get('target_id')

    if (!favoriteType || !targetId) {
      return NextResponse.json(
        { error: 'favorite_type and target_id are required' },
        { status: 400 }
      )
    }

    // 백엔드 API 호출
    const backendUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${backendUrl}/api/projects/${projectId}/favorites?favorite_type=${favoriteType}&target_id=${targetId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to remove favorite' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
