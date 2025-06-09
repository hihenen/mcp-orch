'use client';

import React from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectRole } from '@/types/project';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ShieldAlert } from 'lucide-react';

interface PermissionGateProps {
  requiredRole: ProjectRole;
  projectId?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showFallback?: boolean;
}

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.REPORTER]: 0,
  [ProjectRole.DEVELOPER]: 1,
  [ProjectRole.OWNER]: 2,
};

const ROLE_LABELS: Record<ProjectRole, string> = {
  [ProjectRole.REPORTER]: 'Reporter',
  [ProjectRole.DEVELOPER]: 'Developer', 
  [ProjectRole.OWNER]: 'Owner',
};

export function PermissionGate({
  requiredRole,
  projectId,
  fallback,
  children,
  showFallback = true,
}: PermissionGateProps) {
  const { selectedProject, getCurrentUserRole } = useProjectStore();
  
  // 프로젝트 ID가 제공된 경우 해당 프로젝트의 권한 확인
  // 그렇지 않으면 현재 선택된 프로젝트의 권한 확인
  const targetProjectId = projectId || selectedProject?.id;
  
  if (!targetProjectId) {
    if (showFallback) {
      return (
        <Alert className="border-amber-200 bg-amber-50">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            프로젝트를 선택해주세요.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const userRole = getCurrentUserRole(targetProjectId);
  
  if (!userRole) {
    if (showFallback) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            이 프로젝트에 대한 접근 권한이 없습니다.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const hasPermission = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];

  if (!hasPermission) {
    if (showFallback) {
      const defaultFallback = (
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            이 기능을 사용하려면 <strong>{ROLE_LABELS[requiredRole]}</strong> 권한이 필요합니다. 
            현재 권한: <strong>{ROLE_LABELS[userRole]}</strong>
          </AlertDescription>
        </Alert>
      );
      
      return fallback || defaultFallback;
    }
    return null;
  }

  return <>{children}</>;
}

// 권한 확인 훅
export function useProjectPermission(projectId?: string) {
  const { selectedProject, getCurrentUserRole } = useProjectStore();
  
  const targetProjectId = projectId || selectedProject?.id;
  const userRole = targetProjectId ? getCurrentUserRole(targetProjectId) : null;

  const checkPermission = (requiredRole: ProjectRole): boolean => {
    if (!userRole) return false;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  };

  const canManageProject = checkPermission(ProjectRole.OWNER);
  const canDevelop = checkPermission(ProjectRole.DEVELOPER);
  const canView = checkPermission(ProjectRole.REPORTER);

  return {
    userRole,
    checkPermission,
    canManageProject,
    canDevelop,
    canView,
    hasAccess: !!userRole,
  };
}

// 역할별 배지 컴포넌트
interface RoleBadgeProps {
  role: ProjectRole;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  const roleStyles: Record<ProjectRole, string> = {
    [ProjectRole.OWNER]: 'bg-red-100 text-red-800 border-red-200',
    [ProjectRole.DEVELOPER]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [ProjectRole.REPORTER]: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const roleIcons: Record<ProjectRole, string> = {
    [ProjectRole.OWNER]: '🔴',
    [ProjectRole.DEVELOPER]: '🟡',
    [ProjectRole.REPORTER]: '🔵',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${sizeClasses[size]} ${roleStyles[role]}
      `}
    >
      <span>{roleIcons[role]}</span>
      {ROLE_LABELS[role]}
    </span>
  );
}
