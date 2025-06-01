'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useServerStore, useToolStore, useExecutionStore, useAppStore } from '@/stores';
import { getApiClient } from '@/lib/api';
import { ServerStatusCard } from '@/components/dashboard/ServerStatusCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ModeSelector } from '@/components/dashboard/ModeSelector';
import { Server, Wrench, Activity, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations();
  const { servers, setServers, setLoading: setServersLoading, getServerCount } = useServerStore();
  const { setTools, setLoading: setToolsLoading, getToolCount } = useToolStore();
  const { getExecutionsToday, getExecutionStats } = useExecutionStore();
  const { settings } = useAppStore();

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      const apiClient = getApiClient(settings.apiEndpoint, settings.requestTimeout, settings.maxRetries);
      
      // Load servers
      setServersLoading(true);
      const serversResponse = await apiClient.getServers();
      if (serversResponse.success && serversResponse.data) {
        setServers(serversResponse.data);
      }
      setServersLoading(false);

      // Load tools
      setToolsLoading(true);
      const toolsResponse = await apiClient.getTools();
      if (toolsResponse.success && toolsResponse.data) {
        setTools(toolsResponse.data);
      }
      setToolsLoading(false);
    };

    loadData();
  }, [settings, setServers, setServersLoading, setTools, setToolsLoading]);

  const serverCount = getServerCount();
  const toolCount = getToolCount();
  const executionsToday = getExecutionsToday();
  const executionStats = getExecutionStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('dashboard.stats.totalServers')}
          value={serverCount.total}
          icon={Server}
        />
        <StatsCard
          title={t('dashboard.stats.activeServers')}
          value={serverCount.active}
          description={`${Math.round((serverCount.active / serverCount.total) * 100) || 0}% ${t('dashboard.serverStatus.online')}`}
          icon={Activity}
        />
        <StatsCard
          title={t('dashboard.stats.totalTools')}
          value={toolCount}
          icon={Wrench}
        />
        <StatsCard
          title={t('dashboard.stats.executionsToday')}
          value={executionsToday.length}
          description={executionStats.successRate ? `${executionStats.successRate.toFixed(1)}% success rate` : undefined}
          icon={TrendingUp}
        />
      </div>

      {/* Mode Selector */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ModeSelector />
        </div>
      </div>

      {/* Server Status Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">{t('dashboard.serverStatus.title')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <ServerStatusCard key={server.id} server={server} />
          ))}
          {servers.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No servers configured yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
