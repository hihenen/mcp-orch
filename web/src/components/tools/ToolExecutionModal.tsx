'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2, AlertCircle, CheckCircle, PlayCircle } from 'lucide-react'
import type { MCPTool } from '@/types'
import { useToolStore } from '@/stores/toolStore'
import { useExecutionStore } from '@/stores/executionStore'
import { getApiClient } from '@/lib/api'
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ToolExecutionModalProps {
  tool: MCPTool | null
  isOpen: boolean
  onClose: () => void
}

interface ParameterValue {
  [key: string]: any
}

export function ToolExecutionModal({ tool, isOpen, onClose }: ToolExecutionModalProps) {
  const [parameters, setParameters] = useState<ParameterValue>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('parameters')
  
  const { executeTool } = useToolStore()
  const { addExecution } = useExecutionStore()

  if (!tool) return null

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const handleArrayParameterChange = (paramName: string, index: number, value: string) => {
    setParameters(prev => {
      const array = prev[paramName] || []
      const newArray = [...array]
      newArray[index] = value
      return {
        ...prev,
        [paramName]: newArray
      }
    })
  }

  const handleAddArrayItem = (paramName: string) => {
    setParameters(prev => {
      const array = prev[paramName] || []
      return {
        ...prev,
        [paramName]: [...array, '']
      }
    })
  }

  const handleRemoveArrayItem = (paramName: string, index: number) => {
    setParameters(prev => {
      const array = prev[paramName] || []
      return {
        ...prev,
        [paramName]: array.filter((_: any, i: number) => i !== index)
      }
    })
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    setExecutionError(null)
    setExecutionResult(null)
    setActiveTab('result')

    const startTime = new Date()
    const executionId = `exec-${Date.now()}`
    
    // 백엔드에 실행 시작 기록
    try {
      const apiClient = getApiClient()
      await apiClient.createExecution({
        id: executionId,
        serverId: tool.serverId || tool.namespace.split('.')[0],
        toolId: tool.id || `${tool.namespace}.${tool.name}`,
        toolName: tool.name,
        status: 'running',
        startTime: startTime.toISOString(),
        parameters
      })
    } catch (error) {
      console.error('Failed to create execution record:', error)
    }

    try {
      const result = await executeTool(tool.namespace, tool.name, parameters)
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      setExecutionResult(result)
      
      // 백엔드에 실행 완료 업데이트
      try {
        const apiClient = getApiClient()
        await apiClient.updateExecution(executionId, {
          status: 'completed',
          endTime: endTime.toISOString(),
          duration,
          result
        })
      } catch (error) {
        console.error('Failed to update execution record:', error)
      }
      
      // 로컬 스토어에도 추가
      addExecution({
        id: executionId,
        toolName: tool.name,
        toolId: tool.id || `${tool.namespace}.${tool.name}`,
        serverId: tool.serverId || tool.namespace.split('.')[0],
        parameters,
        result,
        status: 'completed',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration
      })
    } catch (error) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      setExecutionError(errorMessage)
      
      // 백엔드에 실행 실패 업데이트
      try {
        const apiClient = getApiClient()
        await apiClient.updateExecution(executionId, {
          status: 'failed',
          endTime: endTime.toISOString(),
          duration,
          error: errorMessage
        })
      } catch (error) {
        console.error('Failed to update execution record:', error)
      }
      
      // 로컬 스토어에도 추가
      addExecution({
        id: executionId,
        toolName: tool.name,
        toolId: tool.id || `${tool.namespace}.${tool.name}`,
        serverId: tool.serverId || tool.namespace.split('.')[0],
        parameters,
        error: errorMessage,
        status: 'failed',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration
      })
    } finally {
      setIsExecuting(false)
      
      // 실행 히스토리 새로고침
      const { fetchExecutions } = useExecutionStore.getState()
      fetchExecutions(20)
    }
  }

  const renderParameterInput = (paramName: string, paramSchema: any) => {
    const paramType = paramSchema.type
    const isRequired = tool.inputSchema?.required?.includes(paramName)

    if (paramType === 'array') {
      const arrayValues = parameters[paramName] || []
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={paramName}>
              {paramName}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddArrayItem(paramName)}
            >
              Add Item
            </Button>
          </div>
          {paramSchema.description && (
            <p className="text-sm text-muted-foreground">{paramSchema.description}</p>
          )}
          <div className="space-y-2">
            {arrayValues.map((value: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={value}
                  onChange={(e) => handleArrayParameterChange(paramName, index, e.target.value)}
                  placeholder={`Item ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveArrayItem(paramName, index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (paramType === 'object') {
      return (
        <div className="space-y-2">
          <Label htmlFor={paramName}>
            {paramName}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {paramSchema.description && (
            <p className="text-sm text-muted-foreground">{paramSchema.description}</p>
          )}
          <Textarea
            id={paramName}
            value={parameters[paramName] ? JSON.stringify(parameters[paramName], null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleParameterChange(paramName, parsed)
              } catch {
                // 유효하지 않은 JSON일 경우 무시
              }
            }}
            placeholder="Enter JSON object"
            className="font-mono"
            rows={5}
          />
        </div>
      )
    }

    // 기본 (string, number, boolean)
    return (
      <div className="space-y-2">
        <Label htmlFor={paramName}>
          {paramName}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {paramSchema.description && (
          <p className="text-sm text-muted-foreground">{paramSchema.description}</p>
        )}
        <Input
          id={paramName}
          type={paramType === 'number' ? 'number' : 'text'}
          value={parameters[paramName] || ''}
          onChange={(e) => {
            const value = paramType === 'number' ? Number(e.target.value) : e.target.value
            handleParameterChange(paramName, value)
          }}
          placeholder={`Enter ${paramName}`}
        />
      </div>
    )
  }

  const isFormValid = () => {
    if (!tool.inputSchema?.required) return true
    
    return tool.inputSchema.required.every(requiredParam => {
      const value = parameters[requiredParam]
      return value !== undefined && value !== null && value !== ''
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            {tool.name}
          </DialogTitle>
          <DialogDescription>
            {tool.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>
          
          <TabsContent value="parameters" className="mt-4 overflow-y-auto max-h-[50vh]">
            <Card>
              <CardContent className="pt-6">
                {tool.inputSchema?.properties ? (
                  <div className="space-y-4">
                    {Object.entries(tool.inputSchema.properties).map(([paramName, paramSchema]) => (
                      <div key={paramName}>
                        {renderParameterInput(paramName, paramSchema)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    이 도구는 파라미터가 필요하지 않습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="result" className="mt-4 overflow-y-auto max-h-[50vh]">
            <Card>
              <CardContent className="pt-6">
                {isExecuting && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">실행 중...</span>
                  </div>
                )}
                
                {executionError && !isExecuting && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{executionError}</AlertDescription>
                  </Alert>
                )}
                
                {executionResult && !isExecuting && (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>도구가 성공적으로 실행되었습니다</AlertDescription>
                    </Alert>
                    <div className={cn(
                      "p-4 rounded-lg bg-muted/50 font-mono text-sm",
                      "whitespace-pre-wrap break-words overflow-x-auto"
                    )}>
                      {typeof executionResult === 'string' 
                        ? executionResult 
                        : JSON.stringify(executionResult, null, 2)}
                    </div>
                  </div>
                )}
                
                {!isExecuting && !executionError && !executionResult && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    파라미터를 입력하고 실행 버튼을 클릭하세요.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button 
            onClick={handleExecute} 
            disabled={!isFormValid() || isExecuting}
            className="min-w-[100px]"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                실행 중
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                실행
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
