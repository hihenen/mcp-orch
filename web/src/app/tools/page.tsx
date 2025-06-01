"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Play, Code, Server, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToolStore } from "@/stores/toolStore";
import { useServerStore } from "@/stores/serverStore";
import { useExecutionStore } from "@/stores/executionStore";
import { Tool, ToolParameter } from "@/types";

interface ParameterFormData {
  [key: string]: any;
}

export default function ToolsPage() {
  const { tools } = useToolStore();
  const { servers } = useServerStore();
  const { addExecution, updateExecution } = useExecutionStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [parameterValues, setParameterValues] = useState<ParameterFormData>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, we'll use mock data
    const mockTools: Tool[] = [
      {
        id: "github.create_issue",
        name: "create_issue",
        description: "Create a new issue in a GitHub repository",
        serverId: "github-server",
        serverName: "GitHub Server",
        parameters: [
          {
            name: "repository",
            type: "string",
            description: "Repository name (owner/repo)",
            required: true,
          },
          {
            name: "title",
            type: "string",
            description: "Issue title",
            required: true,
          },
          {
            name: "body",
            type: "string",
            description: "Issue body content",
            required: false,
          },
          {
            name: "labels",
            type: "array",
            description: "Labels to add to the issue",
            required: false,
          },
        ],
      },
      {
        id: "github.list_issues",
        name: "list_issues",
        description: "List issues in a GitHub repository",
        serverId: "github-server",
        serverName: "GitHub Server",
        parameters: [
          {
            name: "repository",
            type: "string",
            description: "Repository name (owner/repo)",
            required: true,
          },
          {
            name: "state",
            type: "string",
            description: "Issue state (open, closed, all)",
            required: false,
            default: "open",
          },
        ],
      },
      {
        id: "notion.create_page",
        name: "create_page",
        description: "Create a new page in Notion",
        serverId: "notion-server",
        serverName: "Notion Server",
        parameters: [
          {
            name: "parent_id",
            type: "string",
            description: "Parent page or database ID",
            required: true,
          },
          {
            name: "title",
            type: "string",
            description: "Page title",
            required: true,
          },
          {
            name: "content",
            type: "object",
            description: "Page content blocks",
            required: false,
          },
        ],
      },
      {
        id: "slack.send_message",
        name: "send_message",
        description: "Send a message to a Slack channel",
        serverId: "slack-server",
        serverName: "Slack Server",
        parameters: [
          {
            name: "channel",
            type: "string",
            description: "Channel ID or name",
            required: true,
          },
          {
            name: "text",
            type: "string",
            description: "Message text",
            required: true,
          },
        ],
      },
    ];
    
    useToolStore.getState().setTools(mockTools);
  }, []);

  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.serverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setIsExecuteDialogOpen(true);
    // Initialize parameter values with defaults
    const initialValues: ParameterFormData = {};
    tool.parameters?.forEach(param => {
      if (param.default !== undefined) {
        initialValues[param.name] = param.default;
      }
    });
    setParameterValues(initialValues);
    setExecutionResult(null);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleExecute = async () => {
    if (!selectedTool) return;

    setIsExecuting(true);
    
    // Create execution record
    const execution = {
      id: `exec-${Date.now()}`,
      toolId: selectedTool.id,
      toolName: selectedTool.name,
      serverId: selectedTool.serverId,
      serverName: selectedTool.serverName,
      parameters: parameterValues,
      status: "running" as const,
      startedAt: new Date(),
    };
    
    addExecution(execution);

    // Simulate API call
    setTimeout(() => {
      const mockResult = {
        success: true,
        data: {
          message: "Tool executed successfully",
          result: {
            id: "12345",
            created_at: new Date().toISOString(),
          },
        },
      };
      
      setExecutionResult(mockResult);
      updateExecution(execution.id, {
        status: "completed",
        result: mockResult,
        completedAt: new Date(),
        duration: 2000,
      });
      
      setIsExecuting(false);
    }, 2000);
  };

  const renderParameterInput = (param: ToolParameter) => {
    const value = parameterValues[param.name] || "";

    switch (param.type) {
      case "string":
        if (param.name.includes("body") || param.name.includes("content")) {
          return (
            <Textarea
              id={param.name}
              value={value}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              placeholder={param.description}
              rows={4}
            />
          );
        }
        return (
          <Input
            id={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.description}
          />
        );
      case "array":
        return (
          <Input
            id={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value.split(",").map(s => s.trim()))}
            placeholder="Comma-separated values"
          />
        );
      case "object":
        return (
          <Textarea
            id={param.name}
            value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                handleParameterChange(param.name, JSON.parse(e.target.value));
              } catch {
                handleParameterChange(param.name, e.target.value);
              }
            }}
            placeholder="JSON object"
            rows={4}
          />
        );
      default:
        return (
          <Input
            id={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.description}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tool Execution</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search and execute tools from connected MCP servers
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search tools by name, description, or server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredTools.map((tool) => {
            const server = servers.find(s => s.id === tool.serverId);
            const isAvailable = server?.status === "online";
            
            return (
              <Card 
                key={tool.id} 
                className={`cursor-pointer transition-colors ${
                  isAvailable ? "hover:bg-gray-50 dark:hover:bg-gray-800" : "opacity-60"
                }`}
                onClick={() => isAvailable && handleToolSelect(tool)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                        <CardDescription>{tool.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <Server className="w-3 h-3 mr-1" />
                        {tool.serverName}
                      </Badge>
                      {!isAvailable && (
                        <Badge variant="secondary">Offline</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {tool.parameters && tool.parameters.length > 0 && (
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      Parameters: {tool.parameters.filter(p => p.required).length} required, {tool.parameters.filter(p => !p.required).length} optional
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Execute Tool: {selectedTool?.name}</DialogTitle>
              <DialogDescription>
                {selectedTool?.description}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTool && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Server className="w-4 h-4" />
                  <span>{selectedTool.serverName}</span>
                </div>
                
                <Separator />
                
                {selectedTool.parameters && selectedTool.parameters.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium">Parameters</h4>
                    {selectedTool.parameters.map((param) => (
                      <div key={param.name} className="space-y-2">
                        <Label htmlFor={param.name}>
                          {param.name}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                          <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                        </Label>
                        {renderParameterInput(param)}
                        {param.description && (
                          <p className="text-xs text-gray-500">{param.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">This tool has no parameters.</p>
                )}
                
                {executionResult && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        {executionResult.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        Execution Result
                      </h4>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(executionResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExecuteDialogOpen(false)}>
                Close
              </Button>
              <Button 
                onClick={handleExecute} 
                disabled={isExecuting || !selectedTool}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
