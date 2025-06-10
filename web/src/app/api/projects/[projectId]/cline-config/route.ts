import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// 프로젝트별 Cline 설정 파일 생성 및 다운로드
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await context.params;

    // 백엔드 API 호출
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/projects/${projectId}/cline-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to generate Cline config' },
        { status: response.status }
      );
    }

    const configData = await response.json();
    
    // URL 파라미터로 다운로드 여부 확인
    const url = new URL(request.url);
    const download = url.searchParams.get('download') === 'true';

    if (download) {
      // 파일 다운로드로 응답
      const configJson = JSON.stringify(configData.config, null, 2);
      const fileName = `${configData.project_name || 'project'}-mcp-config.json`;
      
      return new NextResponse(configJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    } else {
      // JSON 데이터로 응답
      return NextResponse.json(configData);
    }

  } catch (error) {
    console.error('Cline config generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
