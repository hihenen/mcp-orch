import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const POST = auth(async function POST(req, { params }) {
  try {
    // Check authentication
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract project_id from params (Next.js 15+ async params)
    const { project_id } = await params;

    // Generate JWT token for backend authentication
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for ownership transfer');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    // Get request body
    const body = await req.json();

    console.log(`✅ Transferring ownership for project ID: ${project_id}`);

    // Call backend API
    const response = await fetch(`${BACKEND_URL}/api/admin/projects/${project_id}/transfer-ownership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Backend ownership transfer error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Admin ownership transfer API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});