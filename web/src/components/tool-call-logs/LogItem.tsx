/**
 * 개별 ToolCallLog 아이템 컴포넌트
 * Datadog/Sentry 스타일의 접힘/펼침 가능한 로그 아이템
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, User, MapPin, Code, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCallLog, STATUS_COLORS, CLIENT_TYPE_ICONS, ERROR_CODE_DESCRIPTIONS } from '@/types/tool-call-logs';

interface LogItemProps {
  log: ToolCallLog;
  isExpanded?: boolean;
  onToggleExpanded?: (logId: number) => void;
}

export function LogItem({ log, isExpanded = false, onToggleExpanded }: LogItemProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  
  const expanded = onToggleExpanded ? isExpanded : localExpanded;
  const toggleExpanded = () => {
    if (onToggleExpanded) {
      onToggleExpanded(log.id);
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const statusConfig = STATUS_COLORS[log.status];
  const clientIcon = CLIENT_TYPE_ICONS[log.client_type as keyof typeof CLIENT_TYPE_ICONS] || CLIENT_TYPE_ICONS.unknown;
  
  // 시간 포맷팅
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // 실행 시간 포맷팅
  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  // JSON 데이터 미리보기
  const formatDataPreview = (data: any, maxLength = 100) => {
    if (!data) return 'N/A';
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length <= maxLength) return jsonStr;
    return jsonStr.substring(0, maxLength) + '...';
  };

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200 hover:shadow-md",
      statusConfig.border,
      "bg-white"
    )}>
      {/* 로그 헤더 (항상 표시) */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={toggleExpanded}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* 상태 아이콘 */}
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-sm",
            statusConfig.bg,
            statusConfig.text
          )}>
            {statusConfig.icon}
          </div>

          {/* 기본 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 truncate">
                {log.tool_name}
              </span>
              <span className="text-xs text-gray-500">
                {clientIcon} {log.client_type}
              </span>
              <span className={cn(
                "px-2 py-1 text-xs rounded-full",
                statusConfig.bg,
                statusConfig.text
              )}>
                {log.status.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimestamp(log.timestamp)}
              </span>
              
              <span className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                {log.session_id.substring(0, 8)}...
              </span>
              
              {log.execution_time && (
                <span className="font-mono">
                  {formatDuration(log.duration_ms)}
                </span>
              )}
              
              {log.ip_address && (
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {log.ip_address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 펼침/접힘 아이콘 */}
        <div className="flex items-center space-x-2">
          {log.error_message && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 상세 정보 (펼쳤을 때만 표시) */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* 메타데이터 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Code className="w-4 h-4 mr-2" />
                메타데이터
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">서버 ID:</span>
                  <span className="font-mono">{log.server_id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">도구 네임스페이스:</span>
                  <span className="font-mono">{log.tool_namespace || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">요청 ID:</span>
                  <span className="font-mono">{log.session_id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">User Agent:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]" title={log.user_agent}>
                    {log.user_agent || 'N/A'}
                  </span>
                </div>
                
                {log.execution_time && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">실행 시간:</span>
                    <span className="font-mono">{log.execution_time.toFixed(3)}초</span>
                  </div>
                )}
              </div>
            </div>

            {/* 에러 정보 (에러인 경우만) */}
            {log.error_message && (
              <div className="space-y-3">
                <h4 className="font-medium text-red-900 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  에러 정보
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500 block">에러 코드:</span>
                    <div className="space-y-1">
                      <span className="font-mono text-red-600">{log.error_code || 'N/A'}</span>
                      {log.error_code && ERROR_CODE_DESCRIPTIONS[log.error_code as keyof typeof ERROR_CODE_DESCRIPTIONS] && (
                        <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded border">
                          {ERROR_CODE_DESCRIPTIONS[log.error_code as keyof typeof ERROR_CODE_DESCRIPTIONS]}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 block">에러 메시지:</span>
                    <pre className="bg-red-50 border border-red-200 p-2 rounded text-red-800 text-xs whitespace-pre-wrap">
                      {log.error_message}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 입력/출력 데이터 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            {/* 입력 데이터 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">입력 데이터</h4>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                  {formatDataPreview(log.input_data, 500)}
                </pre>
              </div>
            </div>

            {/* 출력 데이터 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">출력 데이터</h4>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                  {formatDataPreview(log.output_data, 500)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}