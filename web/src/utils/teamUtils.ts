/**
 * Team-related utility functions
 */

import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil, formatRelativeTime } from '@/lib/date-utils';

/**
 * Format date string to user's locale format
 * @deprecated Use formatDate from @/lib/date-utils instead
 */
export const formatDate = (dateString: string) => {
  return formatDateUtil(dateString);
};

/**
 * Format date time string to user's locale format
 * @deprecated Use formatDateTime from @/lib/date-utils instead
 */
export const formatDateTime = (dateString: string) => {
  return formatDateTimeUtil(dateString);
};

/**
 * 이름에서 이니셜 추출
 */
export const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

/**
 * 역할에 따른 배지 색상 반환
 */
export const getRoleBadgeColor = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'owner':
      return 'border-yellow-300 text-yellow-700 bg-yellow-50';
    case 'developer':
      return 'border-blue-300 text-blue-700 bg-blue-50';
    case 'reporter':
      return 'border-gray-300 text-gray-700 bg-gray-50';
    default:
      return 'border-gray-300 text-gray-700 bg-gray-50';
  }
};

/**
 * 역할 한국어 변환
 */
export const getRoleKorean = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'owner':
      return '소유자';
    case 'developer':
      return '개발자';
    case 'reporter':
      return '리포터';
    default:
      return '멤버';
  }
};

/**
 * 서버 상태에 따른 배지 스타일 반환
 */
export const getServerStatusBadge = (status: string, disabled: boolean) => {
  if (disabled) {
    return { variant: 'secondary' as const, text: '비활성화' };
  }
  
  switch (status) {
    case 'running':
      return { variant: 'default' as const, text: '실행 중', className: 'bg-green-100 text-green-800' };
    case 'stopped':
      return { variant: 'destructive' as const, text: '중지됨' };
    case 'error':
      return { variant: 'destructive' as const, text: '오류' };
    default:
      return { variant: 'secondary' as const, text: '알 수 없음' };
  }
};

/**
 * 활동 타입에 따른 아이콘 정보 반환
 */
export const getActivityIcon = (type: string) => {
  switch (type) {
    case 'member_joined':
    case 'member_left':
      return { icon: 'Users', color: 'text-blue-500' };
    case 'server_added':
    case 'server_removed':
      return { icon: 'Server', color: 'text-green-500' };
    case 'tool_executed':
      return { icon: 'Wrench', color: 'text-orange-500' };
    case 'project_created':
    case 'project_updated':
      return { icon: 'FolderOpen', color: 'text-purple-500' };
    case 'settings_changed':
      return { icon: 'Settings', color: 'text-gray-500' };
    default:
      return { icon: 'Activity', color: 'text-gray-500' };
  }
};

/**
 * API 키를 클립보드에 복사
 */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export const formatFileSize = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
};

/**
 * Display relative time (e.g., "2 hours ago")
 * @deprecated Use formatRelativeTime from @/lib/date-utils instead
 */
export const getRelativeTime = (dateString: string) => {
  return formatRelativeTime(dateString);
};