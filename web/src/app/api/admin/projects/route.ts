import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req) {
  try {
    // Check authentication
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate JWT token for backend authentication
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for projects list');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '100';
    const search = searchParams.get('search') || '';

    // Build backend URL with parameters
    const backendParams = new URLSearchParams({
      skip,
      limit,
    });
    
    if (search) {
      backendParams.append('search', search);
    }

    console.log('✅ Fetching projects list from backend');

    // Call backend API
    const response = await fetch(`${BACKEND_URL}/api/admin/projects?${backendParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Backend projects API error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Admin projects API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = auth(async function POST(req) {
  try {
    // Check authentication
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate JWT token for backend authentication
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for project creation');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    // Get request body
    const body = await req.json();

    console.log('✅ Creating new project via backend');

    // Call backend API
    const response = await fetch(`${BACKEND_URL}/api/admin/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Backend project creation error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Admin project creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});