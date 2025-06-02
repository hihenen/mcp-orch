'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react'
import { useExecutionStore } from '@/stores/executionStore'
import { cn } from "@/lib/utils"
import type { Execution } from '@/types'

interface ExecutionTimelineProps {
  serverId?: string
  toolId?: string
  limit?: number
}

export function ExecutionTimeline({ serverId, toolId, limit = 10 }: ExecutionTimelineProps) {
  const { executions, fetchExecutions } = useExecutionStore()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadExecutions = async () => {
      setIsLoading(true)
      try {
        await fetchExecutions(limit)
      } finally {
        setIsLoading(false)
      }
    }

    loadExecutions()
  }, [fetchExecutions, limit])

  // Filter executions based on serverId and toolId
  const filteredExecutions = executions.filter(exec => {
    if (serverId && exec.serverId !== serverId) return false
    if (toolId && exec.toolId !== toolId) return false
    return true
  })

  const toggleExpanded = (executionId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId)
    } else {
      newExpanded.add(executionId)
    }
    setExpandedItems(newExpanded)
  }

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: Execution['status']) => {
    switch (status) {
      case 'completed':
        return 'default' as const
      case 'failed':
        return 'destructive' as const
      case 'running':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
    return `${Math.floor(duration / 60000)}m ${((duration % 60000) / 1000).toFixed(0)}s`
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Execution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading executions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Execution History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No executions yet
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Timeline items */}
            <div className="space-y-4">
              {filteredExecutions.map((execution, index) => {
                const isExpanded = expandedItems.has(execution.id)
                
                return (
                  <div key={execution.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute left-3.5 w-3 h-3 bg-background border-2 border-primary rounded-full" />
                    
                    {/* Content */}
                    <div className="ml-10">
                      <div
                        className={cn(
                          "border rounded-lg p-4 transition-all",
                          "hover:shadow-md cursor-pointer",
                          isExpanded && "shadow-md"
                        )}
                        onClick={() => toggleExpanded(execution.id)}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(execution.status)}
                              <h4 className="font-semibold">{execution.toolName}</h4>
                              <Badge variant={getStatusBadgeVariant(execution.status)}>
                                {execution.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatTime(execution.startTime)}</span>
                              <span>Duration: {formatDuration(execution.duration)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(execution.id)
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            {/* Parameters */}
                            {Object.keys(execution.parameters).length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Parameters</h5>
                                <div className="p-2 rounded bg-muted/50 text-sm font-mono">
                                  <pre className="whitespace-pre-wrap break-words">
                                    {JSON.stringify(execution.parameters, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Result or Error */}
                            {execution.status === 'completed' && execution.result && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Result</h5>
                                <div className="p-2 rounded bg-green-50 dark:bg-green-950/20 text-sm font-mono">
                                  <pre className="whitespace-pre-wrap break-words">
                                    {typeof execution.result === 'string' 
                                      ? execution.result 
                                      : JSON.stringify(execution.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {execution.status === 'failed' && execution.error && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Error</h5>
                                <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400">
                                  {execution.error}
                                </div>
                              </div>
                            )}

                            {/* Re-run button */}
                            {execution.status !== 'running' && (
                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // TODO: Implement re-run functionality
                                    console.log('Re-run execution:', execution.id)
                                  }}
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  Re-run
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
