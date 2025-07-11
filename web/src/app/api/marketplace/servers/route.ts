import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // process.cwd()는 Next.js 앱이 실행되는 디렉토리 (web)
    // 프로젝트 루트로 이동 후 configs 폴더 접근
    const configPath = join(process.cwd(), '..', 'configs', 'marketplace', 'verified-servers.json');
    console.log('Current working directory:', process.cwd());
    console.log('Trying to read from:', configPath);
    
    const serversData = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    return NextResponse.json(serversData);
  } catch (error) {
    console.error('Failed to load servers:', error);
    console.error('Tried path:', configPath);
    return NextResponse.json(
      { error: 'Failed to load servers' },
      { status: 500 }
    );
  }
}