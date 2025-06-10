'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, FileText, Settings } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast'; // TODO: 토스트 시스템 구현 후 활성화

// 개별 서버 폼 컴포넌트
function IndividualServerForm({ 
  formData, 
  updateField, 
  newArg, 
  setNewArg, 
  addArg, 
  removeArg, 
  newEnvKey, 
  setNewEnvKey, 
  newEnvValue, 
  setNewEnvValue, 
  addEnvVar, 
  removeEnvVar 
}: {
  formData: ServerConfig;
  updateField: (field: keyof ServerConfig, value: any) => void;
  newArg: string;
  setNewArg: (value: string) => void;
  addArg: () => void;
  removeArg: (index: number) => void;
  newEnvKey: string;
  setNewEnvKey: (value: string) => void;
  newEnvValue: string;
  setNewEnvValue: (value: string) => void;
  addEnvVar: () => void;
  removeEnvVar: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">기본 정보</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">서버 이름 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="예: github-server, filesystem-server"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="서버의 역할과 기능을 설명해주세요"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transport">전송 방식</Label>
          <Select value={formData.transport} onValueChange={(value: 'stdio' | 'sse') => updateField('transport', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stdio">Standard I/O</SelectItem>
              <SelectItem value="sse">Server-Sent Events</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 실행 설정 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">실행 설정</h3>
        
        <div className="space-y-2">
          <Label htmlFor="command">명령어 *</Label>
          <Input
            id="command"
            value={formData.command}
            onChange={(e) => updateField('command', e.target.value)}
            placeholder="예: python, node, uvx, /usr/local/bin/my-server"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cwd">작업 디렉토리</Label>
          <Input
            id="cwd"
            value={formData.cwd || ''}
            onChange={(e) => updateField('cwd', e.target.value)}
            placeholder="예: /path/to/server (비어있으면 현재 디렉토리)"
          />
        </div>

        {/* 인자 */}
        <div className="space-y-2">
          <Label>명령어 인자</Label>
          <div className="flex gap-2">
            <Input
              value={newArg}
              onChange={(e) => setNewArg(e.target.value)}
              placeholder="인자 입력 후 추가 버튼 클릭"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArg())}
            />
            <Button type="button" onClick={addArg} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.args.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.args.map((arg, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {arg}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeArg(index)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 환경 변수 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">환경 변수</h3>
        
        <div className="flex gap-2">
          <Input
            value={newEnvKey}
            onChange={(e) => setNewEnvKey(e.target.value)}
            placeholder="변수명"
            className="flex-1"
          />
          <Input
            value={newEnvValue}
            onChange={(e) => setNewEnvValue(e.target.value)}
            placeholder="값"
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEnvVar())}
          />
          <Button type="button" onClick={addEnvVar} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {Object.entries(formData.env).length > 0 && (
          <div className="space-y-2">
            {Object.entries(formData.env).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm font-mono">
                  <strong>{key}</strong> = {value}
                </span>
                <X 
                  className="h-4 w-4 cursor-pointer hover:text-red-500" 
                  onClick={() => removeEnvVar(key)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// JSON 일괄 추가 폼 컴포넌트
function JsonBulkAddForm({ 
  jsonConfig, 
  setJsonConfig, 
  projectId, 
  onServerAdded, 
  onOpenChange 
}: {
  jsonConfig: string;
  setJsonConfig: (value: string) => void;
  projectId: string;
  onServerAdded: (server: ServerConfig) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  // JSON 예시 설정
  const exampleConfig = `{
  "mcpServers": {
    "github-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      },
      "transportType": "stdio",
      "disabled": false
    },
    "filesystem-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {},
      "transportType": "stdio",
      "disabled": false
    }
  }
}`;

  // JSON 일괄 추가 처리
  const handleJsonSubmit = async () => {
    if (!jsonConfig.trim()) {
      alert('JSON 설정을 입력해주세요.');
      return;
    }

    try {
      const config = JSON.parse(jsonConfig);
      
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        throw new Error('올바른 MCP 설정 형식이 아닙니다. mcpServers 객체가 필요합니다.');
      }

      setIsLoading(true);
      const servers = Object.entries(config.mcpServers);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const [serverName, serverConfig] of servers) {
        try {
          const server = serverConfig as any;
          
          const response = await fetch(`/api/projects/${projectId}/servers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: serverName,
              description: server.description || `${serverName} MCP 서버`,
              transport_type: server.transportType === 'sse' ? 'sse' : 'stdio',
              command: server.command,
              args: server.args || [],
              env: server.env || {},
              cwd: server.cwd || null
            }),
            credentials: 'include'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '서버 추가 실패');
          }

          successCount++;
          
          // 콜백 호출 (UI 업데이트용)
          onServerAdded({
            name: serverName,
            description: server.description || `${serverName} MCP 서버`,
            transport: server.transportType === 'sse' ? 'sse' : 'stdio',
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            cwd: server.cwd
          });

        } catch (error) {
          errorCount++;
          errors.push(`${serverName}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }

      // 결과 메시지
      if (successCount > 0 && errorCount === 0) {
        alert(`성공: ${successCount}개 서버가 모두 추가되었습니다.`);
        setJsonConfig('');
        onOpenChange(false);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`부분 성공: ${successCount}개 서버 추가 성공, ${errorCount}개 실패\n\n실패 목록:\n${errors.join('\n')}`);
      } else {
        alert(`실패: 모든 서버 추가에 실패했습니다.\n\n오류 목록:\n${errors.join('\n')}`);
      }

    } catch (error) {
      console.error('JSON 파싱 오류:', error);
      alert(`JSON 형식 오류: ${error instanceof Error ? error.message : '올바른 JSON 형식이 아닙니다.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">MCP 설정 JSON</h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setJsonConfig(exampleConfig)}
          >
            예시 불러오기
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="jsonConfig">JSON 설정 *</Label>
          <Textarea
            id="jsonConfig"
            value={jsonConfig}
            onChange={(e) => setJsonConfig(e.target.value)}
            placeholder="MCP 설정 JSON을 붙여넣으세요..."
            rows={15}
            className="font-mono text-sm"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">사용 방법</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 기존 MCP 설정 파일의 내용을 붙여넣으세요</li>
            <li>• 여러 서버를 한 번에 추가할 수 있습니다</li>
            <li>• "예시 불러오기" 버튼으로 형식을 확인하세요</li>
            <li>• 각 서버는 개별적으로 검증되어 추가됩니다</li>
          </ul>
        </div>

        <Button 
          onClick={handleJsonSubmit} 
          disabled={isLoading || !jsonConfig.trim()}
          className="w-full"
        >
          {isLoading ? '서버 추가 중...' : 'JSON에서 서버 일괄 추가'}
        </Button>
      </div>
    </div>
  );
}

interface ServerConfig {
  name: string;
  description: string;
  transport: 'stdio' | 'sse';
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
}

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerAdded: (server: ServerConfig) => void;
  onServerUpdated?: (server: ServerConfig) => void;
  projectId: string;
  editServer?: {
    id: string;
    name: string;
    description?: string;
    transport?: 'stdio' | 'sse';
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
  };
}

export function AddServerDialog({ 
  open, 
  onOpenChange, 
  onServerAdded, 
  onServerUpdated,
  projectId,
  editServer 
}: AddServerDialogProps) {
  // const { toast } = useToast(); // TODO: 토스트 시스템 구현 후 활성화
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!editServer;
  const [activeTab, setActiveTab] = useState('individual');
  
  // 폼 상태
  const [formData, setFormData] = useState<ServerConfig>({
    name: '',
    description: '',
    transport: 'stdio',
    command: '',
    args: [],
    env: {},
    cwd: ''
  });
  
  // JSON 일괄 추가 상태
  const [jsonConfig, setJsonConfig] = useState('');
  
  // 임시 입력 상태
  const [newArg, setNewArg] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // 입력값 업데이트
  const updateField = (field: keyof ServerConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 인자 추가
  const addArg = () => {
    if (newArg.trim()) {
      updateField('args', [...formData.args, newArg.trim()]);
      setNewArg('');
    }
  };

  // 인자 제거
  const removeArg = (index: number) => {
    updateField('args', formData.args.filter((_, i) => i !== index));
  };

  // 환경 변수 추가
  const addEnvVar = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      updateField('env', { ...formData.env, [newEnvKey.trim()]: newEnvValue.trim() });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  // 환경 변수 제거
  const removeEnvVar = (key: string) => {
    const newEnv = { ...formData.env };
    delete newEnv[key];
    updateField('env', newEnv);
  };

  // 편집 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (editServer) {
      setFormData({
        name: editServer.name,
        description: editServer.description || '',
        transport: editServer.transport || 'stdio',
        command: editServer.command,
        args: editServer.args || [],
        env: editServer.env || {},
        cwd: editServer.cwd || ''
      });
    } else {
      resetForm();
    }
  }, [editServer, open]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      transport: 'stdio',
      command: '',
      args: [],
      env: {},
      cwd: ''
    });
    setNewArg('');
    setNewEnvKey('');
    setNewEnvValue('');
  };

  // 서버 추가/수정 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.command.trim()) {
      alert("입력 오류: 서버 이름과 명령어는 필수입니다.");
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode && editServer) {
        // 서버 수정 API 호출
        const response = await fetch(`/api/projects/${projectId}/servers?serverId=${editServer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            command: formData.command,
            args: formData.args,
            env: formData.env,
            cwd: formData.cwd || null
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '서버 수정 실패');
        }

        const result = await response.json();
        console.log('서버 수정 성공:', result);
        
        onServerUpdated?.(formData);
        alert(`서버 수정 완료: ${formData.name} 서버가 성공적으로 수정되었습니다.`);
      } else {
        // 서버 추가 API 호출
        const response = await fetch(`/api/projects/${projectId}/servers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            transport_type: formData.transport,
            command: formData.command,
            args: formData.args,
            env: formData.env,
            cwd: formData.cwd || null
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '서버 추가 실패');
        }

        const result = await response.json();
        console.log('서버 추가 성공:', result);
        
        onServerAdded(formData);
        alert(`서버 추가 완료: ${formData.name} 서버가 성공적으로 추가되었습니다.`);
      }

      resetForm();
      onOpenChange(false);
      
    } catch (error) {
      console.error(`서버 ${isEditMode ? '수정' : '추가'} 오류:`, error);
      alert(`서버 ${isEditMode ? '수정' : '추가'} 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'MCP 서버 설정 편집' : '새 MCP 서버 추가'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? '서버 설정을 수정합니다. 변경할 필드를 수정해주세요.'
              : '프로젝트에 새로운 MCP 서버를 추가합니다. 모든 필드를 정확히 입력해주세요.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* 편집 모드가 아닐 때만 탭 표시 */}
        {!isEditMode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                개별 추가
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                JSON 일괄 추가
              </TabsTrigger>
            </TabsList>

            {/* 개별 추가 탭 */}
            <TabsContent value="individual" className="space-y-6">
              <form onSubmit={handleSubmit}>
                <IndividualServerForm 
                  formData={formData}
                  updateField={updateField}
                  newArg={newArg}
                  setNewArg={setNewArg}
                  addArg={addArg}
                  removeArg={removeArg}
                  newEnvKey={newEnvKey}
                  setNewEnvKey={setNewEnvKey}
                  newEnvValue={newEnvValue}
                  setNewEnvValue={setNewEnvValue}
                  addEnvVar={addEnvVar}
                  removeEnvVar={removeEnvVar}
                />
              </form>
            </TabsContent>

            {/* JSON 일괄 추가 탭 */}
            <TabsContent value="json" className="space-y-6">
              <JsonBulkAddForm 
                jsonConfig={jsonConfig}
                setJsonConfig={setJsonConfig}
                projectId={projectId}
                onServerAdded={onServerAdded}
                onOpenChange={onOpenChange}
              />
            </TabsContent>
          </Tabs>
        ) : (
          /* 편집 모드일 때는 기존 폼만 표시 */
          <form onSubmit={handleSubmit}>
            <IndividualServerForm 
              formData={formData}
              updateField={updateField}
              newArg={newArg}
              setNewArg={setNewArg}
              addArg={addArg}
              removeArg={removeArg}
              newEnvKey={newEnvKey}
              setNewEnvKey={setNewEnvKey}
              newEnvValue={newEnvValue}
              setNewEnvValue={setNewEnvValue}
              addEnvVar={addEnvVar}
              removeEnvVar={removeEnvVar}
            />
          </form>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          {/* JSON 탭이 아닐 때만 제출 버튼 표시 */}
          {(isEditMode || activeTab === 'individual') && (
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
              {isLoading 
                ? (isEditMode ? '수정 중...' : '추가 중...') 
                : (isEditMode ? '서버 수정' : '서버 추가')
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
