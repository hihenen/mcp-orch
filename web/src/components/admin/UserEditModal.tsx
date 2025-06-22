'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
  projects_count: number;
}

interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  user: UserData | null; // null인 경우 새 사용자 추가
  onSaved: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_active: boolean;
}

export function UserEditModal({ open, onClose, user, onSaved }: UserEditModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    is_admin: false,
    is_active: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email,
        password: '', // 편집 시 비밀번호는 비워둠
        is_admin: user.role === 'admin',
        is_active: user.status === 'active',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        is_admin: false,
        is_active: true,
      });
    }
    setErrors({});
  }, [user, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    if (!isEditing && !formData.password.trim()) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        is_admin: formData.is_admin,
        is_active: formData.is_active,
      };

      // 새 사용자 추가이거나 비밀번호가 입력된 경우만 포함
      if (!isEditing || formData.password) {
        payload.password = formData.password;
      }

      const url = isEditing 
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'create'} user`);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('사용자 저장 실패:', error);
      setErrors({
        submit: error instanceof Error ? error.message : '사용자 저장에 실패했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '사용자 편집' : '새 사용자 추가'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? '사용자 정보를 수정합니다. 비밀번호는 변경할 때만 입력하세요.'
              : '새로운 사용자를 추가합니다. 모든 필드를 입력해주세요.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="사용자 이름"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing ? '새 비밀번호 (선택사항)' : '비밀번호'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditing ? '비밀번호를 변경하려면 입력하세요' : '최소 8자 이상'}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_admin"
                checked={formData.is_admin}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_admin: !!checked })
                }
                disabled={isSubmitting}
              />
              <Label htmlFor="is_admin">관리자 권한</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_active: !!checked })
                }
                disabled={isSubmitting}
              />
              <Label htmlFor="is_active">계정 활성화</Label>
            </div>
          </div>

          {errors.submit && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {errors.submit}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (isEditing ? '수정 중...' : '추가 중...') 
                : (isEditing ? '수정' : '추가')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}