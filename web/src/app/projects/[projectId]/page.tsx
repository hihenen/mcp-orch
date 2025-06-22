'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    // Redirect to Overview page when accessing project detail page directly
    if (projectId) {
      router.replace(`/projects/${projectId}/overview`);
    }
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting page...</p>
      </div>
    </div>
  );
}