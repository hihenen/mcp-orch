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
// import { useToast } from '@/hooks/use-toast'; // TODO: Enable after implementing toast system

// Individual server form component
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
  removeEnvVar,
  showResourceConnectionHint,
  setShowResourceConnectionHint
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
  showResourceConnectionHint: boolean;
  setShowResourceConnectionHint: (value: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">Server Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., github-server, filesystem-server"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe the server's role and functionality"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transport">Transport Method</Label>
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

        <div className="space-y-2">
          <Label htmlFor="compatibilityMode">Connection Mode</Label>
          <Select value={formData.compatibilityMode} onValueChange={(value: 'api_wrapper' | 'resource_connection') => {
            updateField('compatibilityMode', value);
            setShowResourceConnectionHint(false); // Hide hint when selected
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api_wrapper">API Wrapper (Default)</SelectItem>
              <SelectItem value="resource_connection">Resource Connection</SelectItem>
            </SelectContent>
          </Select>
          {showResourceConnectionHint && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                💡 <strong>Detected database/JDBC server:</strong> Consider using "Resource Connection" mode for better tool discovery.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Use "Resource Connection" for database servers (JDBC, SQL) that need sequential initialization.
          </p>
        </div>
      </div>

      {/* Execution Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Execution Settings</h3>
        
        <div className="space-y-2">
          <Label htmlFor="command">Command *</Label>
          <Input
            id="command"
            value={formData.command}
            onChange={(e) => updateField('command', e.target.value)}
            placeholder="e.g., python, node, uvx, /usr/local/bin/my-server"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cwd">Working Directory</Label>
          <Input
            id="cwd"
            value={formData.cwd || ''}
            onChange={(e) => updateField('cwd', e.target.value)}
            placeholder="e.g., /path/to/server (current directory if empty)"
          />
        </div>

        {/* Arguments */}
        <div className="space-y-2">
          <Label>Command Arguments</Label>
          <div className="flex gap-2">
            <Input
              value={newArg}
              onChange={(e) => setNewArg(e.target.value)}
              placeholder="Enter argument and click Add button"
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

      {/* Environment Variables */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Environment Variables</h3>
        
        <div className="flex gap-2">
          <Input
            value={newEnvKey}
            onChange={(e) => setNewEnvKey(e.target.value)}
            placeholder="Variable Name"
            className="flex-1"
          />
          <Input
            value={newEnvValue}
            onChange={(e) => setNewEnvValue(e.target.value)}
            placeholder="Value"
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

// JSON editing/adding form component
function JsonBulkAddForm({ 
  jsonConfig, 
  setJsonConfig, 
  onJsonSubmit,
  isLoading,
  isEditMode = false
}: {
  jsonConfig: string;
  setJsonConfig: (value: string) => void;
  onJsonSubmit: () => void;
  isLoading: boolean;
  isEditMode?: boolean;
}) {

  // JSON 예시 설정 (간단한 형식)
  const exampleConfig = `{
  "excel-mcp-server": {
    "disabled": false,
    "timeout": 300,
    "type": "stdio",
    "compatibility_mode": "api_wrapper",
    "command": "npx",
    "args": [
      "-y",
      "@smithery/cli@latest",
      "run",
      "@negokaz/excel-mcp-server",
      "--key",
      "78f3339f-b944-49c3-bbcb-57e6aa079e2b"
    ]
  },
  "brave-search": {
    "disabled": false,
    "timeout": 60,
    "type": "stdio",
    "compatibility_mode": "api_wrapper",
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-brave-search"
    ],
    "env": {
      "BRAVE_API_KEY": "your-brave-api-key-here"
    }
  },
  "github-server": {
    "disabled": false,
    "timeout": 30,
    "type": "stdio",
    "compatibility_mode": "api_wrapper",
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-github"
    ],
    "env": {
      "GITHUB_TOKEN": "your-github-token-here"
    }
  },
  "database-jdbc": {
    "disabled": false,
    "timeout": 60,
    "type": "stdio",
    "compatibility_mode": "resource_connection",
    "command": "jbang",
    "args": [
      "run",
      "jdbc@quarkiverse/quarkus-mcp-servers",
      "jdbc:postgresql://localhost:5432/mydb"
    ],
    "description": "Database JDBC server example"
  }
}`;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {isEditMode ? 'Edit Server Settings JSON' : 'MCP Settings JSON'}
          </h3>
          {!isEditMode && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setJsonConfig(exampleConfig)}
            >
              Load Example
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="jsonConfig">JSON Settings *</Label>
          <Textarea
            id="jsonConfig"
            value={jsonConfig}
            onChange={(e) => setJsonConfig(e.target.value)}
            placeholder={isEditMode ? 
              "Current server settings are displayed in JSON format. Modify the necessary parts..." : 
              "Paste your server settings JSON here..."
            }
            rows={15}
            className="font-mono text-sm"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Usage Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {isEditMode ? (
              <>
                <li>• Current server settings are displayed in JSON format</li>
                <li>• Directly modify the necessary parts and save</li>
                <li>• You can edit server name, command, environment variables, etc.</li>
                <li>• Please ensure the JSON format is valid</li>
              </>
            ) : (
              <>
                <li>• Paste existing MCP settings or server configurations only</li>
                <li>• Use "Load Example" button to see the simple format</li>
                <li>• Supports "serverName": {`{"disabled": false, "command": "npx", ...}`} format</li>
                <li>• mcpServers wrapper is automatically handled</li>
                <li>• Multiple servers can be added at once</li>
              </>
            )}
          </ul>
        </div>

        <Button 
          onClick={onJsonSubmit} 
          disabled={isLoading || !jsonConfig.trim()}
          className="w-full"
        >
          {isLoading ? 
            (isEditMode ? 'Updating Server...' : 'Adding Servers...') : 
            (isEditMode ? 'Update Server with JSON Settings' : 'Bulk Add Servers from JSON')
          }
        </Button>
      </div>
    </div>
  );
}

interface ServerConfig {
  name: string;
  description: string;
  transport: 'stdio' | 'sse';
  compatibilityMode: 'api_wrapper' | 'resource_connection';
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
    compatibilityMode?: 'api_wrapper' | 'resource_connection';
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
    compatibilityMode: 'api_wrapper',
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
  
  // 자동 감지 힌트 상태
  const [showResourceConnectionHint, setShowResourceConnectionHint] = useState(false);

  // 입력값 업데이트
  const updateField = (field: keyof ServerConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 자동 감지 힌트: command 변경 시 JDBC/DB 관련 키워드 확인
    if (field === 'command' && typeof value === 'string') {
      const command = value.toLowerCase();
      const args = formData.args.join(' ').toLowerCase();
      const isResourceConnection = 
        command.includes('jdbc') || 
        command.includes('jbang') || 
        args.includes('jdbc') ||
        args.includes('database') ||
        args.includes('db') ||
        args.includes('sql');
      
      setShowResourceConnectionHint(isResourceConnection && formData.compatibilityMode === 'api_wrapper');
    }
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

  // 서버 설정을 JSON으로 변환 (편집 모드용)
  const convertServerToJson = (serverConfig: ServerConfig) => {
    const mcpServerConfig = {
      [serverConfig.name]: {
        disabled: false,
        timeout: 30,
        type: serverConfig.transport === 'sse' ? 'sse' : 'stdio',
        compatibility_mode: serverConfig.compatibilityMode || 'api_wrapper',
        command: serverConfig.command,
        args: serverConfig.args || [],
        ...(Object.keys(serverConfig.env || {}).length > 0 && { env: serverConfig.env }),
        ...(serverConfig.cwd && { cwd: serverConfig.cwd }),
        ...(serverConfig.description && { description: serverConfig.description })
      }
    };
    
    return JSON.stringify({ mcpServers: mcpServerConfig }, null, 2);
  };

  // 편집 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (editServer) {
      console.log('🔍 EditServer received:', editServer);
      console.log('🔍 editServer.compatibilityMode:', editServer.compatibilityMode);
      
      const serverConfig = {
        name: editServer.name,
        description: editServer.description || '',
        transport: editServer.transport || 'stdio',
        compatibilityMode: editServer.compatibilityMode || 'api_wrapper',
        command: editServer.command,
        args: editServer.args || [],
        env: editServer.env || {},
        cwd: editServer.cwd || ''
      };
      
      console.log('🔍 Final serverConfig.compatibilityMode:', serverConfig.compatibilityMode);
      
      setFormData(serverConfig);
      
      // 편집 모드일 때 JSON 탭을 현재 서버 설정으로 초기화
      setJsonConfig(convertServerToJson(serverConfig));
    } else {
      resetForm();
      setJsonConfig('');
    }
  }, [editServer, open]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      transport: 'stdio',
      compatibilityMode: 'api_wrapper',
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
      alert("Input Error: Server name and command are required.");
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode && editServer) {
        // 서버 수정 API 호출
        const response = await fetch(`/api/projects/${projectId}/servers/${editServer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            transport: formData.transport,
            compatibility_mode: formData.compatibilityMode,
            command: formData.command,
            args: formData.args,
            env: formData.env,
            cwd: formData.cwd || null
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server update failed');
        }

        const result = await response.json();
        console.log('서버 수정 성공:', result);
        
        onServerUpdated?.(formData);
        alert(`Server Update Completed: ${formData.name} server has been successfully updated.`);
      } else {
        // 서버 추가 API 호출
        const response = await fetch(`/api/projects/${projectId}/servers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            transport_type: formData.transport,
            compatibility_mode: formData.compatibilityMode,
            command: formData.command,
            args: formData.args,
            env: formData.env,
            cwd: formData.cwd || null
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server addition failed');
        }

        const result = await response.json();
        console.log('서버 추가 성공:', result);
        
        onServerAdded(formData);
        alert(`Server Addition Completed: ${formData.name} server has been successfully added.`);
      }

      resetForm();
      onOpenChange(false);
      
    } catch (error) {
      console.error(`서버 ${isEditMode ? '수정' : '추가'} 오류:`, error);
      alert(`Server ${isEditMode ? 'Update' : 'Addition'} Failed: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // JSON 추가/수정 처리
  const handleJsonSubmit = async () => {
    if (!jsonConfig.trim()) {
      alert('Please enter JSON settings.');
      return;
    }

    try {
      const config = JSON.parse(jsonConfig);
      
      // 입력된 JSON이 이미 mcpServers 래퍼를 가지고 있는지 확인
      let mcpServers;
      if (config.mcpServers && typeof config.mcpServers === 'object') {
        // 기존 형식: mcpServers 래퍼가 있음
        mcpServers = config.mcpServers;
      } else if (typeof config === 'object' && config !== null) {
        // 새로운 형식: 서버 설정만 있음 - 자동으로 래퍼 추가
        mcpServers = config;
      } else {
        throw new Error('Invalid MCP settings format.');
      }

      // 🔧 모든 서버에 compatibility_mode가 없으면 기본값 추가
      const normalizedServers = Object.fromEntries(
        Object.entries(mcpServers).map(([serverName, serverConfig]: [string, any]) => {
          const normalizedConfig = {
            ...serverConfig,
            compatibility_mode: serverConfig.compatibility_mode || 'api_wrapper'
          };
          return [serverName, normalizedConfig];
        })
      );
      
      // 정규화된 설정으로 JSON 텍스트 업데이트 (사용자가 다음에 저장할 수 있도록)
      const updatedConfig = config.mcpServers ? 
        { mcpServers: normalizedServers } : 
        normalizedServers;
      setJsonConfig(JSON.stringify(updatedConfig, null, 2));
      
      // 정규화된 서버 객체 사용
      mcpServers = normalizedServers;

      setIsLoading(true);

      // 편집 모드일 때
      if (isEditMode && editServer) {
        const servers = Object.entries(mcpServers);
        if (servers.length !== 1) {
          throw new Error('In edit mode, please enter only one server configuration.');
        }

        const [serverName, serverConfig] = servers[0];
        const server = serverConfig as any;

        const response = await fetch(`/api/projects/${projectId}/servers/${editServer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: serverName,
            description: server.description || '',
            transport: server.type === 'sse' ? 'sse' : 'stdio',
            compatibility_mode: server.compatibility_mode || 'api_wrapper',
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            cwd: server.cwd || null
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server update failed');
        }

        const result = await response.json();
        console.log('서버 수정 성공:', result);
        
        onServerUpdated?.({
          name: serverName,
          description: server.description || '',
          transport: server.type === 'sse' ? 'sse' : 'stdio',
          compatibilityMode: server.compatibility_mode || 'api_wrapper',
          command: server.command || '',
          args: server.args || [],
          env: server.env || {},
          cwd: server.cwd || ''
        });
        
        alert(`Server Update Completed: ${serverName} server has been successfully updated.`);
        onOpenChange(false);
        return;
      }

      // 추가 모드일 때 (기존 로직)
      const servers = Object.entries(mcpServers);
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
              description: server.description || `${serverName} MCP server`,
              transport_type: server.type || 'stdio',
              compatibility_mode: server.compatibility_mode || 'api_wrapper',
              command: server.command,
              args: server.args || [],
              env: server.env || {},
              cwd: server.cwd || null
            }),
            credentials: 'include'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server addition failed');
          }

          successCount++;
          
          // 콜백 호출 (UI 업데이트용)
          onServerAdded({
            name: serverName,
            description: server.description || `${serverName} MCP 서버`,
            transport: server.type === 'sse' ? 'sse' : 'stdio',
            compatibilityMode: server.compatibility_mode || 'api_wrapper',
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            cwd: server.cwd
          });

        } catch (error) {
          errorCount++;
          errors.push(`${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 결과 메시지
      if (successCount > 0 && errorCount === 0) {
        alert(`Success: All ${successCount} servers have been added.`);
        setJsonConfig('');
        onOpenChange(false);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`Partial Success: ${successCount} servers added successfully, ${errorCount} failed\n\nFailed servers:\n${errors.join('\n')}`);
      } else {
        alert(`Failed: All server additions failed.\n\nError list:\n${errors.join('\n')}`);
      }

    } catch (error) {
      console.error('JSON 파싱 오류:', error);
      alert(`JSON Format Error: ${error instanceof Error ? error.message : 'Invalid JSON format.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit MCP Server Settings' : 'Add New MCP Server'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Modify server settings. Please update the fields you want to change.'
              : 'Add a new MCP server to the project. Please enter all fields accurately.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* 편집 모드와 추가 모드 모두 탭 표시 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {isEditMode ? 'Individual Edit' : 'Individual Add'}
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {isEditMode ? 'JSON Edit' : 'JSON Add'}
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
                  showResourceConnectionHint={showResourceConnectionHint}
                  setShowResourceConnectionHint={setShowResourceConnectionHint}
                />
              </form>
            </TabsContent>

            {/* JSON 편집/추가 탭 */}
            <TabsContent value="json" className="space-y-6">
              <JsonBulkAddForm 
                jsonConfig={jsonConfig}
                setJsonConfig={setJsonConfig}
                onJsonSubmit={handleJsonSubmit}
                isLoading={isLoading}
                isEditMode={isEditMode}
              />
            </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {/* Show submit button only when not in JSON tab */}
          {(isEditMode || activeTab === 'individual') && (
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
              {isLoading 
                ? (isEditMode ? 'Updating...' : 'Adding...') 
                : (isEditMode ? 'Update Server' : 'Add Server')
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
