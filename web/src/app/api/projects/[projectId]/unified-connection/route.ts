import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req, ctx) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for unified connection info request');

    const { projectId } = await ctx.params;

    // 3. 백엔드에서 프로젝트 정보 조회
    const projectResponse = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!projectResponse.ok) {
      const error = await projectResponse.text();
      return NextResponse.json({ error }, { status: projectResponse.status });
    }

    const project = await projectResponse.json();

    // 4. unified MCP가 활성화되어 있는지 확인
    if (!project.unified_mcp_enabled) {
      return NextResponse.json({ 
        error: 'Unified MCP mode is not enabled for this project' 
      }, { status: 400 });
    }

    // 5. 연결 정보 생성
    const baseUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';
    const sseEndpoint = `${baseUrl}/projects/${projectId}/unified/sse`;
    const streamableHttpEndpoint = `${baseUrl}/projects/${projectId}/unified/mcp`;
    
    // 6. Cline/Cursor 설정 생성 (SSE 및 Streamable HTTP 모두 포함)
    const clineConfig = {
      mcpServers: {
        [`${project.name}-unified-sse`]: {
          type: "sse",
          url: sseEndpoint,
          headers: {
            "Authorization": "Bearer YOUR_API_TOKEN"
          }
        },
        [`${project.name}-unified-streamable`]: {
          type: "streamable-http",
          url: streamableHttpEndpoint,
          headers: {
            "Authorization": "Bearer YOUR_API_TOKEN"
          }
        }
      }
    };

    const connectionInfo = {
      project_id: projectId,
      project_name: project.name,
      unified_mcp_enabled: project.unified_mcp_enabled,
      sse_endpoint: sseEndpoint,
      streamable_http_endpoint: streamableHttpEndpoint,
      cline_config: clineConfig,
      instructions: {
        setup: "Copy the configuration below to your Cline/Cursor MCP settings",
        note: "Replace YOUR_API_TOKEN with your actual API key from the API Keys page.",
        namespace_info: "In unified mode, tools are namespaced by server name (e.g., server_name__tool_name)",
        connection_types: "Both SSE and Streamable HTTP connections are supported. Choose the one that works best with your client."
      }
    };

    return NextResponse.json(connectionInfo);
  } catch (error) {
    console.error('Unified connection info API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});