'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: {
    id: string;
    name: string;
  } | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteServerDialog({
  open,
  onOpenChange,
  server,
  onConfirm,
  isDeleting = false
}: DeleteServerDialogProps) {
  const [confirmationName, setConfirmationName] = useState('');

  const handleClose = () => {
    setConfirmationName('');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (confirmationName === server?.name) {
      onConfirm();
      handleClose();
    }
  };

  const isValidName = confirmationName === server?.name;

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-left">서버 삭제 확인</DialogTitle>
              <DialogDescription className="text-left">
                이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">
              <strong>"{server.name}"</strong> 서버를 영구적으로 삭제하려고 합니다.
              이 서버의 모든 설정과 연결 정보가 삭제되며, 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation-name">
              확인을 위해 서버 이름을 정확히 입력하세요:
            </Label>
            <div className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              {server.name}
            </div>
            <Input
              id="confirmation-name"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder="서버 이름을 입력하세요"
              className={!isValidName && confirmationName ? 'border-red-300 focus:border-red-500' : ''}
              disabled={isDeleting}
            />
            {!isValidName && confirmationName && (
              <p className="text-sm text-red-600">
                서버 이름이 일치하지 않습니다.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!isValidName || isDeleting}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}