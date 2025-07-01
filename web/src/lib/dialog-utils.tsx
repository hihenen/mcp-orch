'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AlertOptions {
  title?: string;
  message: string;
  buttonText?: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Alert 대체 함수 - Promise 기반으로 사용자가 확인할 때까지 대기
 */
export function showAlert({ title = '알림', message, buttonText = '확인' }: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const AlertComponent = () => {
      const [open, setOpen] = React.useState(true);

      const handleClose = () => {
        setOpen(false);
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(container);
          resolve();
        }, 150); // 애니메이션 완료 대기
      };

      return (
        <AlertDialog open={open} onOpenChange={handleClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleClose}>
                {buttonText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    };

    root.render(<AlertComponent />);
  });
}

/**
 * Confirm 대체 함수 - Promise 기반으로 사용자의 선택을 반환
 */
export function showConfirm({ 
  title = '확인', 
  message, 
  confirmText = '확인', 
  cancelText = '취소',
  variant = 'default'
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const ConfirmComponent = () => {
      const [open, setOpen] = React.useState(true);

      const handleClose = (confirmed: boolean) => {
        setOpen(false);
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(container);
          resolve(confirmed);
        }, 150); // 애니메이션 완료 대기
      };

      return (
        <AlertDialog open={open} onOpenChange={() => handleClose(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleClose(false)}>
                {cancelText}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleClose(true)}
                className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    };

    root.render(<ConfirmComponent />);
  });
}

/**
 * 성공 메시지를 표시하는 전용 함수
 */
export function showSuccess(message: string): Promise<void> {
  return showAlert({
    title: '성공',
    message,
    buttonText: '확인'
  });
}

/**
 * 오류 메시지를 표시하는 전용 함수
 */
export function showError(message: string): Promise<void> {
  return showAlert({
    title: '오류',
    message,
    buttonText: '확인'
  });
}

/**
 * 삭제 확인을 위한 전용 함수
 */
export function showDeleteConfirm(itemName: string, itemType: string = '항목'): Promise<boolean> {
  return showConfirm({
    title: '삭제 확인',
    message: `정말로 "${itemName}" ${itemType}을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
    confirmText: '삭제',
    cancelText: '취소',
    variant: 'destructive'
  });
}