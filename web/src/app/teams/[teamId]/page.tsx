'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  useEffect(() => {
    // 팀 상세 페이지에 직접 접근시 Overview 페이지로 리다이렉트
    if (teamId) {
      router.replace(`/teams/${teamId}/overview`);
    }
  }, [teamId, router]);

  // 리다이렉트 중 로딩 표시
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">페이지를 로드하는 중...</p>
      </div>
    </div>
  );
}