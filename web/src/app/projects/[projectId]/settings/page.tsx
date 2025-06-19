'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings,
  Save,
  Trash,
  AlertTriangle,
  Shield,
  Info
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { SecuritySettingsSection } from '@/components/projects/SecuritySettingsSection';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    loadProject,
    updateProject,
    deleteProject,
    currentUserRole
  } = useProjectStore();

  // 상태 관리
  const [projectData, setProjectData] = useState({
    name: '',
    description: ''
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 페이지 로드 시 데이터 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // 프로젝트 데이터 업데이트
  useEffect(() => {
    if (selectedProject) {
      setProjectData({
        name: selectedProject.name || '',
        description: selectedProject.description || ''
      });
    }
  }, [selectedProject]);

  // 편집 권한 확인 (Owner만 편집 가능)
  const canEdit = currentUserRole?.toLowerCase() === 'owner';

  // 설정 저장 핸들러
  const handleSaveSettings = async () => {
    if (!canEdit) {
      toast.error('설정을 변경할 권한이 없습니다.');
      return;
    }

    if (!projectData.name.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: projectData.name,
        description: projectData.description
      });
      
      toast.success('프로젝트 설정이 저장되었습니다.');
    } catch (error) {
      console.error('프로젝트 설정 저장 오류:', error);
      toast.error('프로젝트 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 프로젝트 삭제 핸들러
  const handleDeleteProject = async () => {
    if (!canEdit) {
      toast.error('프로젝트를 삭제할 권한이 없습니다.');
      return;
    }

    if (deleteConfirmText !== selectedProject?.name) {
      toast.error('프로젝트 이름이 일치하지 않습니다.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      toast.success('프로젝트가 삭제되었습니다.');
      // 프로젝트 목록 페이지로 리다이렉트
      window.location.href = '/projects';
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      toast.error('프로젝트 삭제에 실패했습니다.');
      setIsDeleting(false);
    }
  };

  // 슬러그 자동 생성

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="container py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">프로젝트를 로드하는 중...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="container py-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">프로젝트 설정</h3>
          </div>
          <p className="text-sm text-blue-700">
            프로젝트의 기본 정보, 보안 설정, 그리고 고급 옵션들을 관리할 수 있습니다.
            변경사항은 즉시 적용되며, 일부 설정은 Owner 권한이 필요합니다.
          </p>
        </div>

        {/* 권한 알림 */}
        {!canEdit && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">읽기 전용 모드</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    프로젝트 설정을 변경하려면 Owner 권한이 필요합니다. 현재 역할: {currentUserRole}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기본 정보 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>프로젝트의 기본 정보를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="projectName">프로젝트 이름</Label>
              <Input
                id="projectName"
                type="text"
                value={projectData.name}
                onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!canEdit}
                placeholder="프로젝트 이름을 입력하세요"
              />
            </div>
            <div>
              <Label htmlFor="projectDescription">설명</Label>
              <Textarea
                id="projectDescription"
                value={projectData.description}
                onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                disabled={!canEdit}
                rows={3}
                placeholder="프로젝트에 대한 설명을 입력하세요"
              />
            </div>
            {canEdit && (
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? '저장 중...' : '설정 저장'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 보안 설정 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              보안 설정
            </CardTitle>
            <CardDescription>프로젝트의 보안 및 접근 제어 설정을 관리합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <SecuritySettingsSection projectId={projectId} />
          </CardContent>
        </Card>

        {/* 위험 구역 */}
        {canEdit && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                위험 구역
              </CardTitle>
              <CardDescription>이 작업들은 되돌릴 수 없습니다. 신중하게 진행해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-900 mb-2">프로젝트 삭제</h4>
                  <p className="text-sm text-red-700 mb-4">
                    프로젝트를 삭제하면 모든 서버, 멤버, API 키, 활동 기록이 영구적으로 삭제됩니다.
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        프로젝트 삭제
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-600">프로젝트 삭제</DialogTitle>
                        <DialogDescription>
                          이 작업은 되돌릴 수 없습니다. 프로젝트를 삭제하려면 아래에 프로젝트 이름을 정확히 입력하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            <strong>경고:</strong> 이 작업은 다음을 영구적으로 삭제합니다:
                          </p>
                          <ul className="text-sm text-red-700 mt-2 space-y-1">
                            <li>• 모든 MCP 서버 및 설정</li>
                            <li>• 모든 프로젝트 멤버 및 역할</li>
                            <li>• 모든 API 키 및 접근 권한</li>
                            <li>• 모든 활동 기록 및 로그</li>
                          </ul>
                        </div>
                        <div>
                          <Label htmlFor="deleteConfirm">
                            프로젝트 이름 <strong>"{selectedProject.name}"</strong>을 입력하세요:
                          </Label>
                          <Input
                            id="deleteConfirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={selectedProject.name}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                          취소
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteProject}
                          disabled={deleteConfirmText !== selectedProject.name || isDeleting}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          {isDeleting ? '삭제 중...' : '프로젝트 삭제'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectLayout>
  );
}