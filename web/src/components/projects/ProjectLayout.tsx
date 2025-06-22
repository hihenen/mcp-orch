'use client';

import { useEffect, ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Server, 
  Settings, 
  Activity, 
  Key,
  FileText,
  BarChart3,
  Home
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

interface ProjectLayoutProps {
  children: ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject, 
    projectMembers,
    projectServers,
    loadProject,
    loadProjectMembers,
    loadProjectServers, 
    isLoading 
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectMembers(projectId);
      loadProjectServers(projectId);
    }
  }, [projectId, loadProject, loadProjectMembers, loadProjectServers]);

  const navigationItems = [
    {
      label: 'Overview',
      href: `/projects/${projectId}/overview`,
      icon: BarChart3,
      description: 'Project Overview'
    },
    {
      label: 'Servers',
      href: `/projects/${projectId}/servers`,
      icon: Server,
      description: 'MCP Server Management'
    },
    {
      label: 'Members',
      href: `/projects/${projectId}/members`,
      icon: Users,
      description: 'Team Member Management'
    },
    // {
    //   label: 'Tools',
    //   href: `/projects/${projectId}/tools`,
    //   icon: FileText,
    //   description: '사용 가능한 도구'
    // },
    {
      label: 'API Keys',
      href: `/projects/${projectId}/api-keys`,
      icon: Key,
      description: 'API Key Management'
    },
    {
      label: 'Activity',
      href: `/projects/${projectId}/activity`,
      icon: Activity,
      description: 'Project Activity'
    },
    {
      label: 'Settings',
      href: `/projects/${projectId}/settings`,
      icon: Settings,
      description: 'Project Settings'
    }
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Project not found.</p>
          <Button asChild className="mt-4">
            <Link href="/projects">Back to Project List</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground flex items-center gap-1">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-foreground">
              Projects
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{selectedProject.name}</span>
          </div>
        </div>
      </div>

      {/* Project Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {selectedProject.name}
                </h1>
              </div>
              {selectedProject.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {selectedProject.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{projectMembers ? projectMembers.length : selectedProject.member_count || 0} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Server className="h-4 w-4" />
                  <span>{projectServers ? projectServers.length : selectedProject.server_count || 0} servers</span>
                </div>
                {selectedProject.created_at && (
                  <div>
                    Created: {new Date(selectedProject.created_at).toLocaleDateString('en-US')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-0">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  )}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="container mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}
