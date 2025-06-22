/**
 * ToolCallLog 필터 컴포넌트
 * Datadog/Sentry 스타일의 고급 필터링 UI
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  RefreshCw, 
  X,
  ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LogFilter as LogFilterType, CallStatus, TIME_RANGE_OPTIONS } from '@/types/tool-call-logs';
import { cn } from '@/lib/utils';

interface LogFilterProps {
  filter: LogFilterType;
  onFilterChange: (filter: LogFilterType) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

export function LogFilter({ 
  filter, 
  onFilterChange, 
  onRefresh, 
  isLoading = false,
  className 
}: LogFilterProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>();
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>();
  
  // 활성 필터 수 계산
  const activeFilterCount = Object.entries(filter).filter(([key, value]) => {
    if (key === 'project_id') return false; // project_id는 필수이므로 제외
    if (key === 'time_range' && value === '30m') return false; // 기본값 제외
    return value !== undefined && value !== null && value !== '' && 
           (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  // 필터 업데이트 헬퍼
  const updateFilter = (updates: Partial<LogFilterType>) => {
    onFilterChange({ ...filter, ...updates });
  };

  // 시간 범위 변경 처리
  const handleTimeRangeChange = (timeRange: string) => {
    if (timeRange === 'custom') {
      updateFilter({ 
        time_range: timeRange,
        start_time: undefined,
        end_time: undefined
      });
    } else {
      updateFilter({ 
        time_range: timeRange,
        start_time: undefined,
        end_time: undefined
      });
    }
  };

  // 커스텀 시간 적용
  const applyCustomTime = () => {
    if (tempStartDate && tempEndDate) {
      updateFilter({
        time_range: 'custom',
        start_time: tempStartDate.toISOString(),
        end_time: tempEndDate.toISOString()
      });
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    onFilterChange({
      project_id: filter.project_id,
      time_range: '30m'
    });
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    setIsAdvancedOpen(false);
  };

  // 상태 필터 토글
  const toggleStatusFilter = (status: CallStatus) => {
    const currentStatuses = filter.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    updateFilter({ 
      status: newStatuses.length > 0 ? newStatuses : undefined 
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 메인 필터 바 */}
      <div className="flex items-center space-x-4">
        {/* 검색 입력 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="로그 검색 (도구명, 에러메시지, 입출력 데이터)"
            value={filter.search_text || ''}
            onChange={(e) => updateFilter({ search_text: e.target.value || undefined })}
            className="pl-10"
          />
        </div>

        {/* 시간 범위 선택 */}
        <Select
          value={filter.time_range || '30m'}
          onValueChange={handleTimeRangeChange}
        >
          <SelectTrigger className="w-[180px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 고급 필터 토글 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className={cn(
            "relative",
            activeFilterCount > 0 && "border-blue-500 text-blue-600"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          필터
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* 새로고침 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>

        {/* 필터 초기화 */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-gray-500"
          >
            <X className="h-4 w-4 mr-1" />
            초기화
          </Button>
        )}
      </div>

      {/* 고급 필터 패널 */}
      {isAdvancedOpen && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 서버 ID 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">서버 ID</Label>
              <Input
                placeholder="서버 ID 입력"
                value={filter.server_id || ''}
                onChange={(e) => updateFilter({ server_id: e.target.value || undefined })}
              />
            </div>

            {/* 도구명 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">도구명</Label>
              <Input
                placeholder="도구명 입력"
                value={filter.tool_name || ''}
                onChange={(e) => updateFilter({ tool_name: e.target.value || undefined })}
              />
            </div>

            {/* 세션 ID 필터 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">세션 ID</Label>
              <Input
                placeholder="세션 ID 입력"
                value={filter.session_id || ''}
                onChange={(e) => updateFilter({ session_id: e.target.value || undefined })}
              />
            </div>

            {/* 실행시간 범위 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">실행시간 (초)</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="최소"
                  value={filter.min_execution_time || ''}
                  onChange={(e) => updateFilter({ 
                    min_execution_time: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  className="w-20"
                />
                <span className="self-center text-gray-400">~</span>
                <Input
                  type="number"
                  placeholder="최대"
                  value={filter.max_execution_time || ''}
                  onChange={(e) => updateFilter({ 
                    max_execution_time: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* 상태 필터 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">상태</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(CallStatus).map((status) => (
                <Button
                  key={status}
                  variant={filter.status?.includes(status) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleStatusFilter(status)}
                  className="h-8"
                >
                  {status.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* 커스텀 시간 범위 */}
          {filter.time_range === 'custom' && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <Label className="text-sm font-medium">사용자 정의 시간 범위</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="datetime-local"
                    value={tempStartDate ? tempStartDate.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setTempStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-[200px]"
                    placeholder="시작 시간"
                  />
                  
                  <span className="text-gray-400">~</span>
                  
                  <Input
                    type="datetime-local"
                    value={tempEndDate ? tempEndDate.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setTempEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-[200px]"
                    placeholder="종료 시간"
                  />
                  
                  <Button
                    onClick={applyCustomTime}
                    disabled={!tempStartDate || !tempEndDate}
                  >
                    적용
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 활성 필터 태그 표시 */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filter.search_text && (
            <Badge variant="secondary" className="gap-1">
              검색: {filter.search_text}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter({ search_text: undefined })}
              />
            </Badge>
          )}
          
          {filter.server_id && (
            <Badge variant="secondary" className="gap-1">
              서버: {filter.server_id}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter({ server_id: undefined })}
              />
            </Badge>
          )}
          
          {filter.tool_name && (
            <Badge variant="secondary" className="gap-1">
              도구: {filter.tool_name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter({ tool_name: undefined })}
              />
            </Badge>
          )}
          
          {filter.status && filter.status.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              상태: {filter.status.join(', ')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter({ status: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}