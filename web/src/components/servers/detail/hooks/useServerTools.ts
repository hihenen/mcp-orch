'use client';

import { useState } from 'react';
import { MCPTool } from '../types';

interface UseServerToolsReturn {
  selectedTool: MCPTool | null;
  isToolModalOpen: boolean;
  handleTestTool: (tool: MCPTool) => void;
  handleCloseToolModal: () => void;
}

export function useServerTools(): UseServerToolsReturn {
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);

  // 도구 테스트 핸들러
  const handleTestTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setIsToolModalOpen(true);
  };

  // 도구 모달 닫기 핸들러
  const handleCloseToolModal = () => {
    setSelectedTool(null);
    setIsToolModalOpen(false);
  };

  return {
    selectedTool,
    isToolModalOpen,
    handleTestTool,
    handleCloseToolModal
  };
}