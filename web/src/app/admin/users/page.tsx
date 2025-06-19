'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  UserPlus, 
  Settings,
  MoreHorizontal,
  Calendar,
  Mail,
  User,
  Edit,
  Trash2,
  Trash,
  X
} from 'lucide-react';
import { UserEditModal } from '@/components/admin/UserEditModal';

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

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // 모달 상태 관리
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 체크박스 선택 상태 관리
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // fetchUsers 함수를 먼저 정의
  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        skip: '0',
        limit: '100',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/users?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  // API에서 이미 검색이 처리되므로 필터링 불필요
  const filteredUsers = users;

  // 사용자 처리 핸들러들
  const handleAddUser = () => {
    setEditingUser(null);
    setEditModalOpen(true);
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteUser = (user: UserData) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleUserSaved = () => {
    setEditModalOpen(false);
    setEditingUser(null);
    // 사용자 목록 새로고침
    fetchUsers();
  };

  // 검색 실행 함수
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  // Enter 키 처리
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const handleToggleRole = async (user: UserData) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const isDowngrading = user.role === 'admin' && newRole === 'user';
    
    // 자신의 관리자 권한 해제 방지 확인이 필요하다면 서버에서 처리됨
    if (isDowngrading) {
      const confirmed = window.confirm(
        `${user.name || user.email}의 관리자 권한을 해제하시겠습니까?\n` +
        '이 작업은 즉시 적용됩니다.'
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_admin: newRole === 'admin'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user role');
      }

      // 사용자 목록 새로고침
      fetchUsers();
    } catch (error) {
      console.error('역할 변경 실패:', error);
      alert(error instanceof Error ? error.message : '역할 변경에 실패했습니다.');
    }
  };

  const handleToggleStatus = async (user: UserData) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const isDeactivating = user.status === 'active' && newStatus === 'inactive';
    
    if (isDeactivating) {
      const confirmed = window.confirm(
        `${user.name || user.email} 계정을 비활성화하시겠습니까?\n` +
        '비활성화된 사용자는 로그인할 수 없습니다.'
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_active: newStatus === 'active'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user status');
      }

      // 사용자 목록 새로고침
      fetchUsers();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      alert(error instanceof Error ? error.message : '상태 변경에 실패했습니다.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // 사용자 목록에서 제거
      setUsers(users.filter(u => u.id !== deletingUser.id));
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      alert(error instanceof Error ? error.message : '사용자 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 체크박스 관련 핸들러들
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = new Set(users.map(user => user.id));
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  // 테스트 계정만 선택하는 함수
  const handleSelectTestUsers = () => {
    const testUserIds = new Set(
      users
        .filter(user => user.email.includes('test') && user.email.includes('@example.com'))
        .map(user => user.id)
    );
    setSelectedUsers(testUserIds);
  };

  // 테스트 계정 개수 계산
  const testUsersCount = users.filter(user => 
    user.email.includes('test') && user.email.includes('@example.com')
  ).length;

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelectedUsers = new Set(selectedUsers);
    if (checked) {
      newSelectedUsers.add(userId);
    } else {
      newSelectedUsers.delete(userId);
    }
    setSelectedUsers(newSelectedUsers);
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) {
      alert('삭제할 사용자를 선택해주세요.');
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    const selectedUserIds = Array.from(selectedUsers);

    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_ids: selectedUserIds
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Bulk delete failed');
      }

      const result = await response.json();
      
      // 성공적으로 삭제된 사용자들을 목록에서 제거
      if (result.successful_deletions.length > 0) {
        setUsers(users.filter(u => !result.successful_deletions.includes(u.id)));
        setSelectedUsers(new Set());
      }

      // 결과 메시지 표시
      if (result.failed_deletions.length > 0) {
        const failedMessages = result.failed_deletions.map((failed: any) => 
          `${failed.user_email || failed.user_id}: ${failed.error}`
        );
        alert(`일부 사용자 삭제에 실패했습니다:\n${failedMessages.join('\n')}\n\n성공: ${result.successful_deletions.length}명`);
      } else {
        alert(`${result.successful_deletions.length}명의 사용자가 성공적으로 삭제되었습니다.`);
      }

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('일괄 삭제 실패:', error);
      alert(error instanceof Error ? error.message : '일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // 전체 선택 상태 계산
  const isAllSelected = users.length > 0 && selectedUsers.size === users.length;
  const isPartiallySelected = selectedUsers.size > 0 && selectedUsers.size < users.length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <Settings className="h-3 w-3 mr-1" />
          관리자
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <User className="h-3 w-3 mr-1" />
        사용자
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          활성
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        비활성
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">사용자 관리</h2>
            <p className="text-muted-foreground">시스템 사용자 계정을 관리합니다</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">사용자 관리</h2>
          <p className="text-muted-foreground">시스템 사용자 계정을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          {testUsersCount > 0 && (
            <Button 
              onClick={handleSelectTestUsers}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              🧪 테스트 계정 {testUsersCount}명 선택
            </Button>
          )}
          {selectedUsers.size > 0 && (
            <Button 
              onClick={handleBulkDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash className="h-4 w-4 mr-2" />
              선택된 {selectedUsers.size}명 삭제
            </Button>
          )}
          <Button onClick={handleAddUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            사용자 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              등록된 전체 사용자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              현재 활성 상태 사용자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">관리자</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              관리자 권한 사용자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">신규 가입</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => {
                const createdDate = new Date(u.created_at);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return createdDate > oneWeekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              최근 7일 내 가입
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>
            시스템에 등록된 모든 사용자를 관리할 수 있습니다. 역할과 상태를 클릭하여 바로 변경할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-9 pr-10"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-9 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              variant="default"
              size="default"
              className="px-4"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="모든 사용자 선택"
                      className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>마지막 로그인</TableHead>
                  <TableHead className="w-[70px]">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        aria-label={`${user.name || user.email} 선택`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{user.name || '이름 없음'}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRole(user)}
                          className="h-6 px-2 text-xs"
                        >
                          {user.role === 'admin' ? '↓ 일반' : '↑ 관리자'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(user.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                          className="h-6 px-2 text-xs"
                        >
                          {user.status === 'active' ? '비활성화' : '활성화'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.projects_count}개 프로젝트
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {user.last_login_at ? formatDate(user.last_login_at) : '없음'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 사용자 편집/추가 모달 */}
      <UserEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={editingUser}
        onSaved={handleUserSaved}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 삭제 확인</DialogTitle>
            <DialogDescription>
              정말로 <strong>{deletingUser?.name || deletingUser?.email}</strong> 사용자를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, 사용자 계정이 비활성화됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              onClick={confirmDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄삭제 확인 다이얼로그 */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>일괄 삭제 확인</DialogTitle>
            <DialogDescription>
              선택된 <strong>{selectedUsers.size}명</strong>의 사용자를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/50">
            <div className="text-sm space-y-1">
              <div className="font-medium text-muted-foreground mb-2">삭제될 사용자 목록:</div>
              {Array.from(selectedUsers).map(userId => {
                const user = users.find(u => u.id === userId);
                return user ? (
                  <div key={userId} className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span>{user.name || '이름 없음'} ({user.email})</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground bg-orange-50 border border-orange-200 rounded-md p-3">
            ⚠️ 이 작업은 되돌릴 수 없으며, 선택된 사용자들의 계정이 비활성화됩니다.
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={isBulkDeleting}
            >
              취소
            </Button>
            <Button
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBulkDeleting ? `삭제 중... (${selectedUsers.size}명)` : `${selectedUsers.size}명 삭제`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}