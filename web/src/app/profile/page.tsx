'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Shield, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  image?: string;
  created_at: string;
  is_admin: boolean;
}

interface UpdateProfileRequest {
  name: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  // States
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Dialog states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 세션 체크 및 리다이렉트
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  // 프로필 데이터 로드
  useEffect(() => {
    if (session) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/profile', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('프로필 정보를 불러올 수 없습니다.');
      }
      
      const data = await response.json();
      setProfileData(data);
      setName(data.name || '');
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() } as UpdateProfileRequest),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '프로필 업데이트에 실패했습니다.');
      }
      
      const updatedProfile = await response.json();
      setProfileData(updatedProfile);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      
      // NextAuth 세션 업데이트
      await update({
        name: updatedProfile.name,
      });
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        } as ChangePasswordRequest),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '비밀번호 변경에 실패했습니다.');
      }
      
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordDialogOpen(false);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const userInitials = profileData?.name
    ? profileData.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : profileData?.email?.[0]?.toUpperCase() || 'U';

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || !profileData) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* 헤더 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">프로필 설정</h1>
        <p className="text-muted-foreground">
          계정 정보를 관리하고 보안 설정을 변경하세요.
        </p>
      </div>

      {/* 알림 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
            <CardDescription>
              프로필 사진과 이름을 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 프로필 이미지 */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileData.image || ''} alt={profileData.name || ''} />
                <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-medium">{profileData.name || '이름 없음'}</h3>
                <p className="text-sm text-muted-foreground">{profileData.email}</p>
                {profileData.is_admin && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <Shield className="h-3 w-3" />
                    관리자
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 이름 편집 폼 */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  disabled={isUpdating}
                />
              </div>
              
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  value={profileData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  이메일은 변경할 수 없습니다.
                </p>
              </div>

              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? '저장 중...' : '프로필 업데이트'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 보안 설정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              보안 설정
            </CardTitle>
            <CardDescription>
              비밀번호와 보안 관련 설정을 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium">비밀번호</h4>
                <p className="text-sm text-muted-foreground">
                  마지막 변경: 정보 없음
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                비밀번호 변경
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 계정 관리 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              위험한 설정
            </CardTitle>
            <CardDescription>
              계정 삭제와 같은 되돌릴 수 없는 작업들입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium text-red-600">계정 삭제</h4>
                <p className="text-sm text-muted-foreground">
                  모든 데이터가 영구적으로 삭제됩니다.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                계정 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              보안을 위해 현재 비밀번호를 입력한 후 새 비밀번호를 설정하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  disabled={isUpdating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                  disabled={isUpdating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  disabled={isUpdating}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={isUpdating}
              >
                취소
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 계정 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">계정 삭제 확인</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 모든 프로젝트, 서버, 설정이 영구적으로 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                계정을 삭제하면 다음 데이터가 모두 삭제됩니다:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>모든 프로젝트 및 서버 설정</li>
                  <li>팀 멤버십 및 권한</li>
                  <li>API 키 및 보안 설정</li>
                  <li>사용 기록 및 로그</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // TODO: 계정 삭제 구현
                setIsDeleteDialogOpen(false);
                setError('계정 삭제 기능은 아직 구현되지 않았습니다.');
              }}
            >
              계정 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}