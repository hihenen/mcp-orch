'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Save, 
  RefreshCw,
  Database,
  Server,
  Globe,
  Shield,
  Mail,
  Clock,
  Info
} from 'lucide-react';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultUserRole: 'user' | 'admin';
  maxProjectsPerUser: number;
  maxServersPerProject: number;
  sessionTimeout: number;
  enableAuditLog: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  enableSmtp: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 더미 데이터로 시작 (추후 실제 API 연동)
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      
      // 시뮬레이션된 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dummySettings: SystemSettings = {
        siteName: 'MCP Orchestrator',
        siteDescription: 'Model Context Protocol 서버를 관리하고 오케스트레이션하는 플랫폼',
        allowRegistration: true,
        requireEmailVerification: false,
        defaultUserRole: 'user',
        maxProjectsPerUser: 10,
        maxServersPerProject: 20,
        sessionTimeout: 24,
        enableAuditLog: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        enableSmtp: false
      };
      
      setSettings(dummySettings);
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    
    // 시뮬레이션된 저장 API 호출
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSaving(false);
    // TODO: 실제 API 호출 및 성공/실패 처리
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value
    });
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">시스템 설정</h2>
            <p className="text-muted-foreground">전역 시스템 설정을 관리합니다</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">시스템 설정</h2>
          <p className="text-muted-foreground">전역 시스템 설정을 관리합니다</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      {/* 시스템 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>시스템 정보</span>
          </CardTitle>
          <CardDescription>
            현재 시스템의 기본 정보입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">사이트 이름</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => updateSetting('siteName', e.target.value)}
                placeholder="사이트 이름을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>현재 버전</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">v1.0.0</Badge>
                <span className="text-sm text-muted-foreground">Production</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="siteDescription">사이트 설명</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => updateSetting('siteDescription', e.target.value)}
              placeholder="사이트 설명을 입력하세요"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 사용자 관리 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>사용자 관리</span>
          </CardTitle>
          <CardDescription>
            사용자 등록 및 권한 관련 설정입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>신규 사용자 등록 허용</Label>
              <p className="text-sm text-muted-foreground">
                새로운 사용자가 자유롭게 계정을 생성할 수 있습니다
              </p>
            </div>
            <Switch
              checked={settings.allowRegistration}
              onCheckedChange={(checked) => updateSetting('allowRegistration', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>이메일 인증 필수</Label>
              <p className="text-sm text-muted-foreground">
                신규 가입 시 이메일 인증을 거쳐야 합니다
              </p>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked) => updateSetting('requireEmailVerification', checked)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="maxProjects">사용자당 최대 프로젝트</Label>
              <Input
                id="maxProjects"
                type="number"
                value={settings.maxProjectsPerUser}
                onChange={(e) => updateSetting('maxProjectsPerUser', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxServers">프로젝트당 최대 서버</Label>
              <Input
                id="maxServers"
                type="number"
                value={settings.maxServersPerProject}
                onChange={(e) => updateSetting('maxServersPerProject', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">세션 타임아웃 (시간)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                min="1"
                max="168"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 시스템 보안 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>시스템 보안</span>
          </CardTitle>
          <CardDescription>
            보안 및 감사 관련 설정입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>감사 로그 활성화</Label>
              <p className="text-sm text-muted-foreground">
                모든 사용자 활동을 로그로 기록합니다
              </p>
            </div>
            <Switch
              checked={settings.enableAuditLog}
              onCheckedChange={(checked) => updateSetting('enableAuditLog', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 이메일 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>이메일 설정</span>
          </CardTitle>
          <CardDescription>
            SMTP 서버 설정 및 이메일 알림 관련 설정입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>SMTP 서비스 활성화</Label>
              <p className="text-sm text-muted-foreground">
                이메일 발송 기능을 활성화합니다
              </p>
            </div>
            <Switch
              checked={settings.enableSmtp}
              onCheckedChange={(checked) => updateSetting('enableSmtp', checked)}
            />
          </div>

          {settings.enableSmtp && (
            <>
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP 호스트</Label>
                  <Input
                    id="smtpHost"
                    value={settings.smtpHost}
                    onChange={(e) => updateSetting('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP 포트</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value))}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP 사용자명</Label>
                  <Input
                    id="smtpUsername"
                    value={settings.smtpUsername}
                    onChange={(e) => updateSetting('smtpUsername', e.target.value)}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP 비밀번호</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}