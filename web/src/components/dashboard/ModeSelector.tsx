'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores';

export function ModeSelector() {
  const { operationMode, setOperationMode } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operation Mode</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={operationMode} onValueChange={(value: string) => setOperationMode(value as 'proxy' | 'batch')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proxy">Proxy Mode</TabsTrigger>
            <TabsTrigger value="batch">Batch Mode</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-4">
          <CardDescription>
            {operationMode === 'proxy' 
              ? 'Forward requests to MCP servers in real-time' 
              : 'Execute multiple tools in parallel batches'}
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}
