import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count?: number;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface TeamContextStore {
  // 상태
  selectedTeam: Organization | null;
  userTeams: Organization[];
  loading: boolean;
  error: string | null;

  // 액션
  setSelectedTeam: (team: Organization | null) => void;
  setUserTeams: (teams: Organization[]) => void;
  loadUserTeams: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 유틸리티
  getTeamById: (teamId: string) => Organization | undefined;
  hasTeamPermission: (permission: string) => boolean;
  isTeamOwner: () => boolean;
  isTeamAdmin: () => boolean;
}

export const useTeamStore = create<TeamContextStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      selectedTeam: null,
      userTeams: [],
      loading: false,
      error: null,

      // 액션 구현
      setSelectedTeam: (team) => {
        set({ selectedTeam: team, error: null });
        
        // 팀 변경 시 다른 스토어들에게 알림 (이벤트 발생)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teamChanged', { 
            detail: { team } 
          }));
        }
      },

      setUserTeams: (teams) => {
        set({ userTeams: teams });
        
        // 첫 번째 팀을 기본 선택 (선택된 팀이 없는 경우)
        const { selectedTeam } = get();
        if (!selectedTeam && teams.length > 0) {
          get().setSelectedTeam(teams[0]);
        }
      },

      loadUserTeams: async () => {
        set({ loading: true, error: null });
        
        try {
          // API 토큰 가져오기
          const apiToken = localStorage.getItem('api_token');
          if (!apiToken) {
            throw new Error('API 토큰이 없습니다. 로그인이 필요합니다.');
          }

          // 사용자 조직 목록 조회 API 호출
          const response = await fetch('/api/organizations', {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
            }
            throw new Error(`조직 목록을 불러오는데 실패했습니다: ${response.status}`);
          }

          const teams: Organization[] = await response.json();
          
          set({ 
            userTeams: teams, 
            loading: false,
            error: null 
          });

          // 첫 번째 팀을 기본 선택 (선택된 팀이 없는 경우)
          const { selectedTeam } = get();
          if (!selectedTeam && teams.length > 0) {
            get().setSelectedTeam(teams[0]);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
          set({ 
            loading: false, 
            error: errorMessage,
            userTeams: []
          });
          
          // 데모 데이터로 폴백 (개발 중)
          if (process.env.NODE_ENV === 'development') {
            const demoTeams: Organization[] = [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: "John's Organization",
                description: '개인 조직',
                created_at: '2025-06-01T10:00:00Z',
                member_count: 1,
                role: 'OWNER'
              },
              {
                id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
                name: 'Development Team',
                description: '개발팀 조직',
                created_at: '2025-06-02T14:00:00Z',
                member_count: 5,
                role: 'ADMIN'
              }
            ];
            
            set({ 
              userTeams: demoTeams,
              loading: false,
              error: null
            });

            // 첫 번째 팀을 기본 선택
            const { selectedTeam } = get();
            if (!selectedTeam) {
              get().setSelectedTeam(demoTeams[0]);
            }
          }
        }
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // 유틸리티 함수
      getTeamById: (teamId) => {
        const { userTeams } = get();
        return userTeams.find(team => team.id === teamId);
      },

      hasTeamPermission: (permission) => {
        const { selectedTeam } = get();
        if (!selectedTeam || !selectedTeam.role) return false;

        // 권한 체크 로직 (간단한 예시)
        switch (permission) {
          case 'manage_servers':
            return ['OWNER', 'ADMIN'].includes(selectedTeam.role);
          case 'manage_team':
            return selectedTeam.role === 'OWNER';
          case 'view_logs':
            return ['OWNER', 'ADMIN'].includes(selectedTeam.role);
          case 'execute_tools':
            return ['OWNER', 'ADMIN', 'MEMBER'].includes(selectedTeam.role);
          default:
            return false;
        }
      },

      isTeamOwner: () => {
        const { selectedTeam } = get();
        return selectedTeam?.role === 'OWNER';
      },

      isTeamAdmin: () => {
        const { selectedTeam } = get();
        return ['OWNER', 'ADMIN'].includes(selectedTeam?.role || '');
      }
    }),
    {
      name: 'team-context-storage',
      partialize: (state) => ({
        selectedTeam: state.selectedTeam,
        // userTeams는 세션마다 새로 로드
      }),
    }
  )
);

// 팀 변경 이벤트 리스너를 위한 훅
export const useTeamChangeListener = (callback: (team: Organization | null) => void) => {
  if (typeof window !== 'undefined') {
    const handleTeamChange = (event: CustomEvent) => {
      callback(event.detail.team);
    };

    window.addEventListener('teamChanged', handleTeamChange as EventListener);
    
    return () => {
      window.removeEventListener('teamChanged', handleTeamChange as EventListener);
    };
  }
  
  return () => {};
};
