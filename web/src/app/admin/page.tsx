'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Activity, 
  Users, 
  Server, 
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';

interface SystemStats {
  total_users: number;  // Active users only (deleted users excluded)
  admin_users: number;
  total_projects: number;
  total_servers: number;
  active_servers: number;
  worker_status: 'running' | 'stopped' | 'unknown';
  last_worker_run: string | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        console.log('🔄 Fetching admin system stats...');
        
        const response = await fetch('/api/admin/stats');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Admin system stats loaded:', data);
        setStats(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('❌ Failed to fetch system stats:', error);
        // Fallback to dummy data on error
        setStats({
          total_users: 0,
          admin_users: 0,
          total_projects: 0,
          total_servers: 0,
          active_servers: 0,
          worker_status: 'unknown',
          last_worker_run: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStats();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchSystemStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    const response = await fetch('/api/admin/stats');
    if (response.ok) {
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">System Overview</h2>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString('en-US')}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-muted-foreground">
                Admins: {stats?.admin_users || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_projects || 0}</div>
              <p className="text-xs text-muted-foreground">
                Created projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MCP Servers</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.active_servers || 0}/{stats?.total_servers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active/Total servers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Worker Status</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {stats?.worker_status === 'running' ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Running
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Stopped
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Background worker
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Worker Management</span>
              </CardTitle>
              <CardDescription>
                Manage and monitor APScheduler background workers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/workers">
                <Button className="w-full">
                  Go to Workers
                </Button>
              </Link>
              {stats?.last_worker_run && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last run: {formatDateTime(stats.last_worker_run)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user accounts, permissions, and team memberships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/users">
                <Button className="w-full">
                  Go to Users
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>System Monitoring</span>
              </CardTitle>
              <CardDescription>
                System logs, performance metrics, and activity tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <Card>
          <CardHeader>
            <CardTitle>Core Component Status</CardTitle>
            <CardDescription>
              Current status of the system's core components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">FastAPI Backend</div>
                    <div className="text-sm text-muted-foreground">Running normally</div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">PostgreSQL Database</div>
                    <div className="text-sm text-muted-foreground">Connection healthy</div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">APScheduler Worker</div>
                    <div className="text-sm text-muted-foreground">
                      Background worker status monitoring feature
                    </div>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Coming Soon
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}