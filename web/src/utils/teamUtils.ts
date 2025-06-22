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
 * Extract initials from name
 */
export const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

/**
 * Return badge color based on role
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
 * Role English translation
 */
export const getRoleEnglish = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'owner':
      return 'Owner';
    case 'developer':
      return 'Developer';
    case 'reporter':
      return 'Reporter';
    default:
      return 'Member';
  }
};

/**
 * @deprecated Use getRoleEnglish instead
 */
export const getRoleKorean = getRoleEnglish;

/**
 * Return badge style based on server status
 */
export const getServerStatusBadge = (status: string, disabled: boolean) => {
  if (disabled) {
    return { variant: 'secondary' as const, text: 'Disabled' };
  }
  
  switch (status) {
    case 'running':
      return { variant: 'default' as const, text: 'Running', className: 'bg-green-100 text-green-800' };
    case 'stopped':
      return { variant: 'destructive' as const, text: 'Stopped' };
    case 'error':
      return { variant: 'destructive' as const, text: 'Error' };
    default:
      return { variant: 'secondary' as const, text: 'Unknown' };
  }
};

/**
 * Return icon information based on activity type
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
 * Copy API key to clipboard
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
 * Convert file size to human readable format
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