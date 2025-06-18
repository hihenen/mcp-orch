'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { WorkerConfig } from '@/hooks/useWorkerStatus';

interface WorkerConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: WorkerConfig;
  onSave: (config: Partial<WorkerConfig>) => Promise<void>;
}

export function WorkerConfigModal({
  open,
  onOpenChange,
  currentConfig,
  onSave
}: WorkerConfigModalProps) {
  const [config, setConfig] = useState<WorkerConfig>(currentConfig);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const changes: Partial<WorkerConfig> = {};
      
      // 변경된 값들만 포함
      if (config.server_check_interval !== currentConfig.server_check_interval) {
        changes.server_check_interval = config.server_check_interval;
      }
      if (config.max_workers !== currentConfig.max_workers) {
        changes.max_workers = config.max_workers;
      }
      if (config.coalesce !== currentConfig.coalesce) {
        changes.coalesce = config.coalesce;
      }
      if (config.max_instances !== currentConfig.max_instances) {
        changes.max_instances = config.max_instances;
      }

      if (Object.keys(changes).length === 0) {
        onOpenChange(false);
        return;
      }

      await onSave(changes);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save worker config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
    return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>워커 설정 변경</DialogTitle>
          <DialogDescription>
            APScheduler 워커의 동작 설정을 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="interval">서버 체크 간격 (초)</Label>
            <Input
              id="interval"
              type="number"
              min="60"
              max="3600"
              value={config.server_check_interval}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                server_check_interval: parseInt(e.target.value) || 300
              }))}
            />
            <p className="text-xs text-muted-foreground">
              현재: {formatInterval(config.server_check_interval)} (60초 ~ 1시간)
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max-workers">최대 워커 수</Label>
            <Input
              id="max-workers"
              type="number"
              min="1"
              max="10"
              value={config.max_workers}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                max_workers: parseInt(e.target.value) || 3
              }))}
            />
            <p className="text-xs text-muted-foreground">
              동시에 실행할 수 있는 최대 워커 수 (1-10)
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="max-instances">최대 작업 인스턴스 수</Label>
            <Input
              id="max-instances"
              type="number"
              min="1"
              max="5"
              value={config.max_instances}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                max_instances: parseInt(e.target.value) || 1
              }))}
            />
            <p className="text-xs text-muted-foreground">
              동일한 작업의 최대 동시 실행 수 (1-5)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="coalesce"
              checked={config.coalesce}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                coalesce: checked
              }))}
            />
            <Label htmlFor="coalesce">중복 작업 병합</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            실행 대기 중인 동일한 작업들을 하나로 병합합니다.
          </p>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '저장 중...' : '설정 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}