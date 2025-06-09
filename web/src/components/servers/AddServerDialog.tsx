'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast'; // TODO: 토스트 시스템 구현 후 활성화

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
      alert("입력 오류: 서버 이름과 명령어는 필수입니다."); // TODO: 토스트로 교체
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode) {
        // TODO: 실제 API 호출로 서버 수정
        // const response = await fetch(`/api/projects/${projectId}/servers/${editServer.id}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData),
        //   credentials: 'include'
        // });
        
        // if (!response.ok) throw new Error('서버 수정 실패');

        // 임시로 성공 처리
        onServerUpdated?.(formData);
        alert(`서버 수정 완료: ${formData.name} 서버가 성공적으로 수정되었습니다.`); // TODO: 토스트로 교체
      } else {
        // TODO: 실제 API 호출로 서버 추가
        // const response = await fetch(`/api/projects/${projectId}/servers`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData),
        //   credentials: 'include'
        // });

        // if (!response.ok) throw new Error('서버 추가 실패');

        // 임시로 성공 처리
        onServerAdded(formData);
        alert(`서버 추가 완료: ${formData.name} 서버가 성공적으로 추가되었습니다.`); // TODO: 토스트로 교체
      }

      resetForm();
      onOpenChange(false);
      
    } catch (error) {
      console.error(`서버 ${isEditMode ? '수정' : '추가'} 오류:`, error);
      alert(`서버 ${isEditMode ? '수정' : '추가'} 실패: 서버 ${isEditMode ? '수정' : '추가'} 중 오류가 발생했습니다.`); // TODO: 토스트로 교체
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading 
              ? (isEditMode ? '수정 중...' : '추가 중...') 
              : (isEditMode ? '서버 수정' : '서버 추가')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
