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

  // 서버 기본 정보 우선 로드 (빠른 로딩)
  const fetchServerBasicInfo = async (): Promise<boolean> => {
    try {
      console.log('📋 1단계: 서버 목록에서 기본 정보 우선 로드');
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const servers = await response.json();
        const targetServer = servers.find((s: any) => s.id === serverId);
        
        if (targetServer) {
          console.log('✅ 서버 기본 정보 로드 성공 - 화면 즉시 표시');
          setServer({
            ...targetServer,
            status: 'loading', // 상세 정보 로딩 중 상태
            tools: [],
            tools_count: 0
          });
          setIsLoading(false); // 기본 정보로 화면 표시
          return true; // 기본 정보 로드 성공
        } else {
          throw new Error('Server not found.');
        }
      } else {
        throw new Error('Failed to fetch server list.');
      }
    } catch (error) {
      console.error('❌ 서버 기본 정보 로드 실패:', error);
      return false; // 기본 정보 로드 실패
    }
  };

  // 서버 목록에서 해당 서버 정보 가져오기 (최후 대안)
  const fetchServerFromList = async () => {
    try {
      console.log('⚠️ 최후 대안: 서버 목록에서 기본 정보 가져오기');
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const servers = await response.json();
        const targetServer = servers.find((s: any) => s.id === serverId);
        
        if (targetServer) {
          toast.warning('MCP server connection test timed out. Server settings are available for review.');
          setServer({
            ...targetServer,
            status: 'timeout',
            tools: [],
            tools_count: 0
          });
        } else {
          throw new Error('Server not found.');
        }
      } else {
        throw new Error('Failed to fetch server list.');
      }
    } catch (error) {
      console.error('Failed to fetch server info from list:', error);
      toast.error('Failed to load server information.');
      router.push(`/projects/${projectId}/servers`);
    }
  };

  // 백그라운드 상세 정보 로딩 (느린 로딩)
  const fetchServerDetailInfo = async () => {
    try {
      console.log('🔄 2단계: 백그라운드에서 상세 정보 로드');
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 서버 상세 정보 로드 성공:', data);
        
        // 상세 정보로 업데이트
        setServer(prevServer => ({
          ...data,
          // 기본 정보에서 이미 로드된 필드 유지 (깜빡임 방지)
          name: prevServer?.name || data.name,
          description: prevServer?.description || data.description
        }));
        
        // 타임아웃 상태인 경우 사용자에게 알림
        if (data.status === 'timeout') {
          toast.warning('MCP server connection test timed out. Server settings are maintained.');
        }
      } else if (response.status === 408) {
        // 408 타임아웃 에러 처리
        console.warn('⏰ 서버 연결 테스트 타임아웃 - 기본 정보 유지');
        
        try {
          const errorData = await response.json();
          console.log('타임아웃 에러 응답 데이터:', errorData);
          
          // 에러 응답에 서버 정보가 포함되어 있는지 확인
          if (errorData.server) {
            setServer(prevServer => ({
              ...prevServer,
              ...errorData.server,
              status: 'timeout'
            }));
          } else {
            // 현재 서버 상태를 timeout으로 업데이트
            setServer(prevServer => prevServer ? {
              ...prevServer,
              status: 'timeout'
            } : null);
          }
          
          toast.warning('MCP server connection test timed out. Server settings are available for review.');
        } catch (parseError) {
          console.error('타임아웃 응답 파싱 실패:', parseError);
          setServer(prevServer => prevServer ? {
            ...prevServer,
            status: 'timeout'
          } : null);
          toast.warning('MCP server connection test timed out.');
        }
      } else {
        console.error('❌ 서버 상세 정보 로드 실패:', response.status);
        // 상세 정보 로드 실패해도 기본 정보는 유지
        setServer(prevServer => prevServer ? {
          ...prevServer,
          status: 'error'
        } : null);
      }
    } catch (error) {
      console.error('❌ 서버 상세 정보 로드 오류:', error);
      // 네트워크 오류 등으로 상세 정보 로드 실패해도 기본 정보는 유지
      setServer(prevServer => prevServer ? {
        ...prevServer,
        status: 'error'
      } : null);
    }
  };

  // 단계적 서버 정보 로드 (개선된 메인 함수)
  const loadServerDetail = async () => {
    if (!projectId || !serverId) return;
    
    setIsLoading(true);
    
    try {
      // 1단계: 서버 기본 정보 우선 로드 (1-2초)
      const basicInfoLoaded = await fetchServerBasicInfo();
      
      if (basicInfoLoaded) {
        // 기본 정보 로드 성공 - 화면 즉시 표시
        // 2단계: 백그라운드에서 상세 정보 로드
        fetchServerDetailInfo(); // 비동기로 실행 (await 없음)
      } else {
        // 기본 정보 로드도 실패한 경우 - 기존 방식 fallback
        console.log('⚠️ 기본 정보 로드 실패 - 기존 방식으로 fallback');
        await fetchServerFromList();
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Exception occurred while loading server info:', error);
      toast.error('An error occurred while loading server information.');
      router.push(`/projects/${projectId}/servers`);
      setIsLoading(false);
    }
  };

  // 서버 업데이트 핸들러
  const handleServerUpdated = async (updatedServerData: any) => {
    try {
      toast.success('Server settings have been updated.');
      // 서버 정보 새로고침
      await loadServerDetail();
    } catch (error) {
      console.error('Server update refresh error:', error);
      toast.error('An error occurred while refreshing server information.');
    }
  };

  // 컴포넌트 마운트 시 서버 정보 로드
  useEffect(() => {
    loadServerDetail();
  }, [projectId, serverId]);

  // 재시도 함수
  const retryConnection = async () => {
    toast.info('Retrying server connection...');
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
