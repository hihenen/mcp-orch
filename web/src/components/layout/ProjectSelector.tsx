'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useFavoriteStore } from '@/stores/favoriteStore';
import { Project } from '@/types/project';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Check, 
  ChevronsUpDown, 
  Plus, 
  FolderOpen,
  Users,
  AlertCircle,
  Bell,
  AlertTriangle,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, createShortcut } from '@/hooks/useKeyboardShortcuts';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectSelectorProps {
  className?: string;
  showCreateProject?: boolean;
}

export function ProjectSelector({ 
  className, 
  showCreateProject = true 
}: ProjectSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  
  const {
    currentProject,
    userProjects,
    currentUserRole,
    isLoading,
    error,
    isProjectSwitching,
    switchingToProject,
    setCurrentProject,
    loadUserProjects,
    initializeFromLocalStorage,
  } = useProjectStore();

  const {
    favorites,
    loadFavorites,
    toggleFavorite,
    isFavorite,
    setCurrentProjectId,
  } = useFavoriteStore();

  // Initialize
  useEffect(() => {
    initializeFromLocalStorage();
    loadUserProjects();
  }, [initializeFromLocalStorage, loadUserProjects]);

  // Load favorites when current project changes
  useEffect(() => {
    if (currentProject) {
      setCurrentProjectId(currentProject.id);
    } else {
      setCurrentProjectId(null);
    }
  }, [currentProject, setCurrentProjectId]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts([
    // Ctrl+P (or Cmd+P on Mac) - Open/close project selector
    createShortcut('p', () => {
      setOpen(!open);
    }, { ctrl: true, description: 'Open/close project selector' }),

    // Number keys 1-9 - Quick switch to project by order
    ...Array.from({ length: 9 }, (_, i) => 
      createShortcut((i + 1).toString(), () => {
        if (!open && userProjects[i]) {
          handleProjectSelect(userProjects[i]);
        }
      }, { ctrl: true, description: `Switch to project ${i + 1}` })
    ),

    // Ctrl+Shift+P - Create new project
    createShortcut('p', () => {
      if (showCreateProject) {
        handleCreateProject();
      }
    }, { ctrl: true, shift: true, description: 'Create new project' })
  ]);

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    setOpen(false);
    
    // When selected from header, stay on current page and only change context
    // Do not navigate to project detail page
  };

  const handleCreateProject = () => {
    setOpen(false);
    router.push('/projects?create=true');
  };

  // Favorite toggle handler
  const handleToggleFavorite = async (
    e: React.MouseEvent, 
    project: Project
  ) => {
    e.stopPropagation(); // Prevent project selection event
    
    if (!currentProject) return;
    
    try {
      await toggleFavorite(currentProject.id, 'project', project.id, project.name);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Sort projects by favorite status
  const sortedProjects = React.useMemo(() => {
    return [...userProjects].sort((a, b) => {
      const aIsFavorite = isFavorite('project', a.id);
      const bIsFavorite = isFavorite('project', b.id);
      
      // Place favorited projects at the top
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      // Sort by name within the same group
      return a.name.localeCompare(b.name);
    });
  }, [userProjects, favorites]);

  const getProjectInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'developer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reporter':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Project notification check function
  const hasNotifications = (project: Project) => {
    return (project.notification_count && project.notification_count > 0) || 
           (project.error_count && project.error_count > 0) || 
           project.has_new_activity;
  };

  // Notification badge rendering function
  const renderNotificationBadge = (project: Project) => {
    if (project.error_count && project.error_count > 0) {
      return (
        <div className="relative">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          {project.error_count > 1 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
            >
              {project.error_count}
            </Badge>
          )}
        </div>
      );
    }
    
    if (project.notification_count && project.notification_count > 0) {
      return (
        <div className="relative">
          <Bell className="h-4 w-4 text-blue-500" />
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-blue-500 text-white"
          >
            {project.notification_count}
          </Badge>
        </div>
      );
    }
    
    if (project.has_new_activity) {
      return <div className="h-2 w-2 bg-green-500 rounded-full"></div>;
    }
    
    return null;
  };

  if (error) {
    return (
      <Button variant="outline" className={cn("w-64 justify-start", className)}>
        <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
        <span className="truncate">Failed to load projects</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-64 justify-between",
            className
          )}
          disabled={isLoading}
        >
          {isProjectSwitching ? (
            <div className="flex items-center">
              <Skeleton className="mr-2 h-5 w-5 rounded-full" />
              <div className="flex flex-col space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="ml-2 flex items-center space-x-1">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            </div>
          ) : currentProject ? (
            <div className="flex items-center">
              <Avatar className="mr-2 h-5 w-5">
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-xs">
                  {getProjectInitials(currentProject.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{currentProject.name}</span>
              {currentUserRole && (
                <Badge 
                  variant="secondary" 
                  className={cn("ml-2 text-xs", getRoleColor(currentUserRole))}
                >
                  {currentUserRole}
                </Badge>
              )}
              {/* 현재 프로젝트 알림 배지 */}
              {hasNotifications(currentProject) && (
                <div className="ml-2">
                  {renderNotificationBadge(currentProject)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center text-muted-foreground">
              <FolderOpen className="mr-2 h-4 w-4" />
              <span>Select Project</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            {sortedProjects.length > 0 && (
              <CommandGroup heading="My Projects">
                {sortedProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => handleProjectSelect(project)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="text-xs">
                          {getProjectInitials(project.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="font-medium">{project.name}</div>
                          {/* 프로젝트별 알림 배지 */}
                          {hasNotifications(project) && (
                            <div className="ml-2">
                              {renderNotificationBadge(project)}
                            </div>
                          )}
                        </div>
                        {project.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {project.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {/* 즐겨찾기 별 아이콘 */}
                        <button
                          onClick={(e) => handleToggleFavorite(e, project)}
                          className={cn(
                            "p-1 rounded hover:bg-accent transition-colors",
                            isFavorite('project', project.id) 
                              ? "text-yellow-500 hover:text-yellow-600" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title={isFavorite('project', project.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star 
                            className={cn(
                              "h-4 w-4",
                              isFavorite('project', project.id) && "fill-current"
                            )} 
                          />
                        </button>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            currentProject?.id === project.id 
                              ? "opacity-100" 
                              : "opacity-0"
                          )}
                        />
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateProject && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateProject}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Project
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// 간단한 프로젝트 정보 표시 컴포넌트
export function ProjectInfo({ className }: { className?: string }) {
  const { currentProject, currentUserRole } = useProjectStore();

  if (!currentProject) return null;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-xs">
          {currentProject.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center space-x-2">
        <span className="font-medium text-sm">{currentProject.name}</span>
        {currentUserRole && (
          <Badge variant="secondary" className="text-xs">
            {currentUserRole}
          </Badge>
        )}
      </div>
    </div>
  );
}
