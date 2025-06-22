'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  useEffect(() => {
    // Redirect to Overview page when accessing team detail page directly
    if (teamId) {
      router.replace(`/teams/${teamId}/overview`);
    }
  }, [teamId, router]);

  // Loading display during redirect
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}