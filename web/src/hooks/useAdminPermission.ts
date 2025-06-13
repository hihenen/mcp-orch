'use client';

import { useSession } from 'next-auth/react';

export function useAdminPermission() {
  const { data: session } = useSession();
  
  const isAdmin = session?.user?.isAdmin || false;
  
  return {
    isAdmin,
    canAccessGlobalServers: isAdmin,
    canManageGlobalSettings: isAdmin,
  };
}
