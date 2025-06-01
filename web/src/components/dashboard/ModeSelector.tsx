'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores';
import { useTranslations } from 'next-intl';

export function ModeSelector() {
  const t = useTranslations('dashboard.mode');
  const { operationMode, setOperationMode } = useAppStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={operationMode} onValueChange={(value) => setOperationMode(value as 'proxy' | 'batch')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proxy">{t('proxy')}</TabsTrigger>
            <TabsTrigger value="batch">{t('batch')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-4">
          <CardDescription>
            {operationMode === 'proxy' ? t('proxyDescription') : t('batchDescription')}
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}
