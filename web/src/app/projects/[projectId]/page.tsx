'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    // 프로젝트 상세 페이지에 접근하면 Overview 페이지로 리다이렉트
    if (projectId) {
      router.replace(`/projects/${projectId}/overview`);
    }
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">페이지를 이동하는 중...</p>
      </div>
    </div>
  );
}