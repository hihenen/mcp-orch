'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServerDetail } from '../types';

interface UseServerDetailProps {
  projectId: string;
  serverId: string;
}

interface UseServerDetailReturn {
  server: ServerDetail | null;
  isLoading: boolean;
  loadServerDetail: () => Promise<void>;
  handleServerUpdated: (updatedServerData: any) => Promise<void>;
}

export function useServerDetail({ projectId, serverId }: UseServerDetailProps): UseServerDetailReturn {
  const router = useRouter();
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 서버 상세 정보 로드
  const loadServerDetail = async () => {
    if (!projectId || !serverId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('서버 상세 정보 로드:', data);
        setServer(data);
      } else {
        console.error('서버 상세 정보 로드 실패:', response.status);
        toast.error('서버 정보를 불러올 수 없습니다.');
        router.push(`/projects/${projectId}/servers`);
      }
    } catch (error) {
      console.error('서버 상세 정보 로드 오류:', error);
      toast.error('서버 정보를 불러오는 중 오류가 발생했습니다.');
      router.push(`/projects/${projectId}/servers`);
    } finally {
      setIsLoading(false);
    }
  };

  // 서버 업데이트 핸들러
  const handleServerUpdated = async (updatedServerData: any) => {
    try {
      toast.success('서버 설정이 업데이트되었습니다.');
      // 서버 정보 새로고침
      await loadServerDetail();
    } catch (error) {
      console.error('서버 업데이트 후 새로고침 오류:', error);
      toast.error('서버 정보를 새로고침하는 중 오류가 발생했습니다.');
    }
  };

  // 컴포넌트 마운트 시 서버 정보 로드
  useEffect(() => {
    loadServerDetail();
  }, [projectId, serverId]);

  return {
    server,
    isLoading,
    loadServerDetail,
    handleServerUpdated
  };
}