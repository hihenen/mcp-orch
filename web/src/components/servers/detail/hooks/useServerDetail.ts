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
  retryConnection: () => Promise<void>;
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
      } else if (response.status === 408) {
        // 타임아웃 에러 처리
        const errorData = await response.json();
        console.error('서버 연결 테스트 타임아웃:', errorData);
        toast.error(errorData.error || 'MCP 서버 연결 테스트가 시간 초과되었습니다.');
        
        // 타임아웃 시에도 서버 정보는 표시하되, 상태를 "연결 확인 중" 또는 "타임아웃"으로 설정
        setServer({
          id: serverId,
          name: '서버 정보 로딩 실패',
          status: 'timeout',
          description: '서버 연결 테스트가 시간 초과되었습니다.',
          command: '',
          args: [],
          env: {},
          disabled: false,
          tools: [],
          logs: [],
          usage_stats: null,
          last_health_check: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
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

  // 재시도 함수
  const retryConnection = async () => {
    toast.info('서버 연결을 다시 시도합니다...');
    await loadServerDetail();
  };

  return {
    server,
    isLoading,
    loadServerDetail,
    handleServerUpdated,
    retryConnection
  };
}