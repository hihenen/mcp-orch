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
  Globe,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface SecuritySettings {
  jwt_auth_required: boolean;
  allowed_ip_ranges: string[];
}

interface SecuritySettingsSectionProps {
  projectId: string;
}

export function SecuritySettingsSection({ projectId }: SecuritySettingsSectionProps) {
  const [settings, setSettings] = useState<SecuritySettings>({
    jwt_auth_required: true,
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
        console.error('Failed to load security settings');
      }
    } catch (error) {
      console.error('Security settings load error:', error);
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
        toast.success('Security settings have been saved.');
      } else {
        const error = await response.text();
        toast.error(`Failed to save security settings: ${error}`);
      }
    } catch (error) {
      console.error('Security settings save error:', error);
      toast.error('An error occurred while saving security settings.');
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
            Authentication Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading settings...</p>
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
          Authentication Settings
        </CardTitle>
        <CardDescription>
          Manage JWT authentication settings for all MCP connections in your project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 인증 설정 */}
        <div className="space-y-4">
          <h4 className="font-medium">JWT Authentication</h4>
          
          {/* JWT 인증 설정 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="font-medium">JWT Authentication Required</Label>
                <p className="text-sm text-muted-foreground">
                  Require JWT authentication for all MCP connections (SSE and Message endpoints)
                </p>
              </div>
            </div>
            <Switch
              checked={settings.jwt_auth_required}
              onCheckedChange={(checked: boolean) => 
                setSettings(prev => ({ ...prev, jwt_auth_required: checked }))
              }
            />
          </div>
        </div>

        {/* IP 범위 제한 - 준비 중 */}
        <div className="space-y-4 opacity-60">
          <h4 className="font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Allowed IP Ranges
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          </h4>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="192.168.1.0/24 or 10.0.0.1"
                value={newIpRange}
                onChange={(e) => setNewIpRange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIpRange()}
                disabled
                className="cursor-not-allowed"
              />
              <Button onClick={addIpRange} variant="outline" disabled>
                Add
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
                <p className="text-sm text-muted-foreground">All IPs allowed (feature coming soon)</p>
              )}
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                ⚠️ IP range restriction feature is currently under development. It will be available in future updates.
              </p>
            </div>
          </div>
        </div>

        {/* 현재 상태 안내 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Current Authentication Status</h4>
              <div className="text-sm text-blue-700 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span>JWT Authentication:</span>
                  <Badge variant={settings.jwt_auth_required ? "default" : "secondary"}>
                    {settings.jwt_auth_required ? "Required" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>IP Restriction:</span>
                  <Badge variant="outline">
                    Coming Soon
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
              <h4 className="font-medium text-green-900">Recommended Settings</h4>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• <strong>JWT Authentication:</strong> Recommended to enable for secure MCP connections</li>
                <li>• <strong>API Keys:</strong> Use project API keys for external MCP client access</li>
                <li>• <strong>IP Restriction:</strong> Currently under development - coming in future updates</li>
                <li>• Settings changes are automatically saved</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 저장 상태 표시 */}
        {isSaving && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Saving settings...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
