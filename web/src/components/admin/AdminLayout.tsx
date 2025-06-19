'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Settings, 
  Activity, 
  Zap,
  Home,
  Shield,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isAdmin } = useAdminPermission();

  // Admin permission check
  useEffect(() => {
    if (status === 'loading') return; // Don't check during loading
    
    if (!session) {
      // Redirect to login page if no session
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
      return;
    }
    
    if (!isAdmin) {
      // Redirect to projects page if not admin
      router.push('/projects');
      return;
    }
  }, [session, status, isAdmin, router, pathname]);

  // Show loading if loading or no permission
  if (status === 'loading' || !session || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-muted-foreground">
            {status === 'loading' ? 'Loading...' : 'Checking permissions...'}
          </p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
      description: 'User account and permission management',
      available: true
    },
    {
      label: 'Teams',
      href: '/admin/teams',
      icon: Users,
      description: 'Team management and organization',
      available: true
    },
    {
      label: 'Projects',
      href: '/admin/projects',
      icon: Settings,
      description: 'Project management and oversight',
      available: true
    },
    {
      label: 'API Keys',
      href: '/admin/api-keys',
      icon: Key,
      description: 'API key monitoring and management',
      available: true
    },
    {
      label: 'Activity',
      href: '/admin/activity',
      icon: Activity,
      description: 'System logs and audit trails',
      available: false,
      comingSoon: true
    },
    {
      label: 'Workers',
      href: '/admin/workers',
      icon: Zap,
      description: 'APScheduler background workers',
      available: true
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') {
      return true;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

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
            <span className="text-foreground font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* Admin Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">
                  Admin Panel
                </h1>
                <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Manage and monitor the entire system
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-0">
            {/* Overview Tab */}
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium",
                pathname === '/admin'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              )}
              title="Admin Dashboard"
            >
              <Home className="h-4 w-4" />
              Overview
            </Link>
            
            {/* Main Menu Items */}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              if (!item.available) {
                return (
                  <div
                    key={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium",
                      "border-transparent text-muted-foreground/60 cursor-not-allowed"
                    )}
                    title={`${item.description} (Coming Soon)`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.comingSoon && (
                      <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                );
              }
              
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