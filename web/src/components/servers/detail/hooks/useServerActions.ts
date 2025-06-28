'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServerDetail } from '../types';

interface UseServerActionsProps {
  projectId: string;
  server: ServerDetail | null;
  onServerUpdated: () => Promise<void>;
}

interface UseServerActionsReturn {
  handleToggleServer: () => Promise<void>;
  handleRestartServer: () => Promise<void>;
  handleRefreshStatus: () => Promise<void>;
  handleDeleteServer: () => Promise<void>;
}

export function useServerActions({ 
  projectId, 
  server, 
  onServerUpdated 
}: UseServerActionsProps): UseServerActionsReturn {
  const router = useRouter();

  // 서버 토글 핸들러
  const handleToggleServer = async () => {
    if (!server) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 상태 변경 실패');
      }

      const data = await response.json();
      console.log('서버 토글 성공:', data);
      
      // 서버 정보 새로고침
      await onServerUpdated();
      
      toast.success(`서버가 ${server.is_enabled ? '비활성화' : '활성화'}되었습니다.`);
    } catch (error) {
      console.error('서버 토글 오류:', error);
      toast.error(`서버 상태 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 재시작 핸들러
  const handleRestartServer = async () => {
    if (!server) return;

    try {
      toast.info('서버를 재시작하는 중...');
      
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/restart`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 재시작 실패');
      }

      const data = await response.json();
      console.log('서버 재시작 성공:', data);
      
      // 서버 정보 새로고침
      await onServerUpdated();
      
      toast.success('서버가 재시작되었습니다.');
    } catch (error) {
      console.error('서버 재시작 오류:', error);
      toast.error(`서버 재시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 상태 새로고침 핸들러
  const handleRefreshStatus = async () => {
    if (!server) return;

    try {
      toast.info('서버 상태를 확인하는 중...');
      
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/refresh-status`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 상태 새로고침 실패');
      }

      const data = await response.json();
      console.log('서버 상태 새로고침 성공:', data);
      
      // 서버 정보 새로고침
      await onServerUpdated();
      
      toast.success(`서버 상태가 업데이트되었습니다. (도구: ${data.tools_count}개)`);
    } catch (error) {
      console.error('서버 상태 새로고침 오류:', error);
      toast.error(`서버 상태 새로고침 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 삭제 핸들러
  const handleDeleteServer = async () => {
    if (!server) return;

    if (!confirm(`정말로 "${server.name}" 서버를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 삭제 실패');
      }

      console.log('서버 삭제 성공');
      toast.success(`"${server.name}" 서버가 삭제되었습니다.`);
      
      // 서버 목록 페이지로 이동
      router.push(`/projects/${projectId}/servers`);
    } catch (error) {
      console.error('서버 삭제 오류:', error);
      toast.error(`서버 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  return {
    handleToggleServer,
    handleRestartServer,
    handleRefreshStatus,
    handleDeleteServer
  };
}