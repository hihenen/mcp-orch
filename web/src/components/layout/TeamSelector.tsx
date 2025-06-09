'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTeamStore, Organization } from '@/stores/teamStore';
import { useRouter } from 'next/navigation';

interface TeamSelectorProps {
  className?: string;
}

export function TeamSelector({ className }: TeamSelectorProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const {
    selectedTeam,
    userTeams,
    loading,
    error,
    setSelectedTeam,
    loadUserTeams,
    hasTeamPermission
  } = useTeamStore();

  // 컴포넌트 마운트 시 팀 목록 로드
  useEffect(() => {
    if (userTeams.length === 0 && !loading) {
      loadUserTeams();
    }
  }, [userTeams.length, loading, loadUserTeams]);

  const handleTeamSelect = (team: Organization) => {
    setSelectedTeam(team);
    setOpen(false);
  };

  const handleCreateTeam = () => {
    setOpen(false);
    router.push('/teams?action=create');
  };

  const handleManageTeams = () => {
    setOpen(false);
    router.push('/teams');
  };

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
        <div className="w-24 h-4 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center space-x-2 text-destructive", className)}>
        <Users className="w-4 h-4" />
        <span className="text-sm">팀 로드 실패</span>
      </div>
    );
  }

  if (!selectedTeam && userTeams.length === 0) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateTeam}
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-2" />
          팀 생성
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between h-9"
          >
            {selectedTeam ? (
              <div className="flex items-center space-x-2 min-w-0">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-xs">
                    {getTeamInitials(selectedTeam.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{selectedTeam.name}</span>
                {selectedTeam.role && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs px-1 py-0", getRoleBadgeColor(selectedTeam.role))}
                  >
                    {selectedTeam.role}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">팀 선택...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="팀 검색..." />
            <CommandList>
              <CommandEmpty>팀을 찾을 수 없습니다.</CommandEmpty>
              <CommandGroup heading="내 팀">
                {userTeams.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={team.name}
                    onSelect={() => handleTeamSelect(team)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {getTeamInitials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="truncate text-sm font-medium">
                            {team.name}
                          </span>
                          {team.role && (
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs px-1 py-0", getRoleBadgeColor(team.role))}
                            >
                              {team.role}
                            </Badge>
                          )}
                        </div>
                        {team.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {team.description}
                          </p>
                        )}
                        {team.member_count && (
                          <p className="text-xs text-muted-foreground">
                            멤버 {team.member_count}명
                          </p>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        selectedTeam?.id === team.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleManageTeams}>
                  <Settings className="mr-2 h-4 w-4" />
                  팀 관리
                </CommandItem>
                {hasTeamPermission('manage_team') && (
                  <CommandItem onSelect={handleCreateTeam}>
                    <Plus className="mr-2 h-4 w-4" />
                    새 팀 생성
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
