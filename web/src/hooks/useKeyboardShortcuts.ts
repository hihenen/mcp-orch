'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 입력 필드에서는 단축키 비활성화
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const {
        key,
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
        callback
      } = shortcut;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrlKey &&
        event.metaKey === metaKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        callback(event);
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// 일반적인 키보드 단축키 헬퍼
export const createShortcut = (
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    description?: string;
  } = {}
): KeyboardShortcut => {
  // Mac에서는 Cmd, Windows/Linux에서는 Ctrl 사용
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return {
    key,
    ctrlKey: isMac ? false : (options.ctrl ?? false),
    metaKey: isMac ? (options.ctrl ?? false) : (options.meta ?? false),
    shiftKey: options.shift ?? false,
    altKey: options.alt ?? false,
    callback,
    description: options.description
  };
};
