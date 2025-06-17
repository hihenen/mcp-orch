'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Server, 
  MessageSquare,
  Globe,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface SecuritySettings {
  sse_auth_required: boolean;
  message_auth_required: boolean;
  allowed_ip_ranges: string[];
}

interface SecuritySettingsSectionProps {
  projectId: string;
}

export function SecuritySettingsSection({ projectId }: SecuritySettingsSectionProps) {
  const [settings, setSettings] = useState<SecuritySettings>({
    sse_auth_required: false,
    message_auth_required: true,
    allowed_ip_ranges: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newIpRange, setNewIpRange] = useState('');

  // 보안 설정 로드
  useEffect(() => {
    loadSecuritySettings();
  }, [projectId]);

  const loadSecuritySettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/security`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('보안 설정 로드 실패');
      }
    } catch (error) {
      console.error('보안 설정 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}/security`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('보안 설정이 저장되었습니다.');
      } else {
        const error = await response.text();
        toast.error(`보안 설정 저장 실패: ${error}`);
      }
    } catch (error) {
      console.error('보안 설정 저장 오류:', error);
      toast.error('보안 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const addIpRange = () => {
    if (newIpRange.trim() && !settings.allowed_ip_ranges.includes(newIpRange.trim())) {
      setSettings(prev => ({
        ...prev,
        allowed_ip_ranges: [...prev.allowed_ip_ranges, newIpRange.trim()]
      }));
      setNewIpRange('');
    }
  };

  const removeIpRange = (ipRange: string) => {
    setSettings(prev => ({
      ...prev,
      allowed_ip_ranges: prev.allowed_ip_ranges.filter(ip => ip !== ipRange)
    }));
  };

  // 설정 변경 시 자동 저장
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveSecuritySettings();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [settings, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            인증 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">설정을 불러오는 중...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          인증 설정
        </CardTitle>
        <CardDescription>
          프로젝트의 SSE 연결과 메시지 호출에 대한 인증 설정을 관리합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 인증 설정 */}
        <div className="space-y-4">
          <h4 className="font-medium">MCP 인증 설정</h4>
          
          <div className="grid grid-cols-1 gap-4">
            {/* SSE 인증 설정 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-blue-600" />
                <div>
                  <Label className="font-medium">SSE 연결 인증</Label>
                  <p className="text-sm text-muted-foreground">
                    /sse 엔드포인트 접근 시 인증 요구 (현재 Cline에서 미지원)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.sse_auth_required}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ ...prev, sse_auth_required: checked }))
                }
              />
            </div>

            {/* Message 인증 설정 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <Label className="font-medium">메시지 호출 인증</Label>
                  <p className="text-sm text-muted-foreground">
                    /message 엔드포인트 도구 호출 시 인증 요구 (권장)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.message_auth_required}
                onCheckedChange={(checked: boolean) => 
                  setSettings(prev => ({ ...prev, message_auth_required: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* IP 범위 제한 - 준비 중 */}
        <div className="space-y-4 opacity-60">
          <h4 className="font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            허용된 IP 범위
            <Badge variant="outline" className="text-xs">
              준비 중
            </Badge>
          </h4>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="192.168.1.0/24 또는 10.0.0.1"
                value={newIpRange}
                onChange={(e) => setNewIpRange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIpRange()}
                disabled
                className="cursor-not-allowed"
              />
              <Button onClick={addIpRange} variant="outline" disabled>
                추가
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {settings.allowed_ip_ranges.map((ipRange) => (
                <Badge key={ipRange} variant="secondary" className="flex items-center gap-1 opacity-60">
                  {ipRange}
                  <button
                    onClick={() => removeIpRange(ipRange)}
                    className="ml-1 hover:text-red-600 cursor-not-allowed"
                    disabled
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {settings.allowed_ip_ranges.length === 0 && (
                <p className="text-sm text-muted-foreground">모든 IP 허용 (기능 준비 중)</p>
              )}
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                ⚠️ IP 범위 제한 기능은 현재 개발 중입니다. 향후 업데이트에서 제공될 예정입니다.
              </p>
            </div>
          </div>
        </div>

        {/* 현재 상태 안내 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">현재 인증 상태</h4>
              <div className="text-sm text-blue-700 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span>SSE 연결:</span>
                  <Badge variant={settings.sse_auth_required ? "default" : "secondary"}>
                    {settings.sse_auth_required ? "인증 필요" : "인증 불필요"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>메시지 호출:</span>
                  <Badge variant={settings.message_auth_required ? "default" : "secondary"}>
                    {settings.message_auth_required ? "인증 필요" : "인증 불필요"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>IP 제한:</span>
                  <Badge variant="outline">
                    준비 중
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 권장사항 */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">권장 설정</h4>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• <strong>SSE 인증:</strong> 현재 Cline에서 지원하지 않으므로 비활성화 권장</li>
                <li>• <strong>메시지 인증:</strong> 보안을 위해 활성화 권장</li>
                <li>• <strong>IP 제한:</strong> 현재 개발 중 - 향후 업데이트에서 제공 예정</li>
                <li>• 설정 변경은 자동으로 저장됩니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 저장 상태 표시 */}
        {isSaving && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              설정 저장 중...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
