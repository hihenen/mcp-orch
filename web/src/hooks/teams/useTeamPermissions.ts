import { useTeamStore } from '@/stores/teamStore';

export const useTeamPermissions = () => {
  const { selectedTeam } = useTeamStore();

  const canAccess = (requiredRole: 'owner' | 'developer' | 'reporter') => {
    if (!selectedTeam?.role) return false;
    
    const roleHierarchy = { owner: 3, developer: 2, reporter: 1 };
    const userRoleLevel = roleHierarchy[selectedTeam.role.toLowerCase() as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= roleHierarchy[requiredRole];
  };

  const isOwner = () => canAccess('owner');
  const isDeveloper = () => canAccess('developer');
  const isReporter = () => canAccess('reporter');

  const hasPermission = (permission: string) => {
    if (!selectedTeam?.role) return false;

    switch (permission) {
      case 'manage_team':
        return isOwner();
      case 'manage_servers':
      case 'manage_projects':
      case 'invite_members':
        return isDeveloper();
      case 'view_data':
      case 'execute_tools':
        return isReporter();
      default:
        return false;
    }
  };

  return {
    canAccess,
    isOwner,
    isDeveloper,
    isReporter,
    hasPermission,
    currentRole: selectedTeam?.role || 'reporter'
  };
};