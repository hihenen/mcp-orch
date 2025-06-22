/**
 * 즐겨찾기 상태 관리 스토어
 * 프로젝트별 사용자 즐겨찾기 관리
 */

import { create } from 'zustand'

// 즐겨찾기 타입 정의
export type FavoriteType = 'server' | 'tool' | 'project'

export interface Favorite {
  id: string
  favorite_type: FavoriteType
  target_id: string
  target_name: string
  created_at: string
}

export interface FavoriteCreate {
  favorite_type: FavoriteType
  target_id: string
  target_name: string
}

interface FavoriteStore {
  // 상태
  favorites: Favorite[]
  isLoading: boolean
  error: string | null
  currentProjectId: string | null

  // 액션
  setCurrentProjectId: (projectId: string | null) => void
  loadFavorites: (projectId: string, favoriteType?: FavoriteType) => Promise<void>
  addFavorite: (projectId: string, favorite: FavoriteCreate) => Promise<void>
  removeFavorite: (projectId: string, favoriteId: string) => Promise<void>
  removeFavoriteByTarget: (projectId: string, favoriteType: FavoriteType, targetId: string) => Promise<void>
  isFavorite: (favoriteType: FavoriteType, targetId: string) => boolean
  toggleFavorite: (projectId: string, favoriteType: FavoriteType, targetId: string, targetName: string) => Promise<void>
  getFavoritesByType: (favoriteType: FavoriteType) => Favorite[]
  clearFavorites: () => void
  reset: () => void
}


export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  // 초기 상태
  favorites: [],
  isLoading: false,
  error: null,
  currentProjectId: null,

  // 현재 프로젝트 ID 설정
  setCurrentProjectId: (projectId) => {
    set({ currentProjectId: projectId })
    // 프로젝트가 변경되면 즐겨찾기도 초기화
    if (projectId) {
      get().loadFavorites(projectId)
    } else {
      set({ favorites: [] })
    }
  },

  // 즐겨찾기 목록 로드
  loadFavorites: async (projectId, favoriteType) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = favoriteType ? `?favorite_type=${favoriteType}` : ''
      const response = await fetch(`/api/projects/${projectId}/favorites${params}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load favorites: ${response.statusText}`)
      }
      
      const favorites = await response.json()
      set({ favorites, isLoading: false })
    } catch (error) {
      console.error('Load favorites error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load favorites',
        isLoading: false 
      })
    }
  },

  // 즐겨찾기 추가
  addFavorite: async (projectId, favorite) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/projects/${projectId}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(favorite),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to add favorite: ${response.statusText}`)
      }
      
      const newFavorite = await response.json()
      set(state => ({
        favorites: [...state.favorites, newFavorite],
        isLoading: false
      }))
    } catch (error) {
      console.error('Add favorite error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add favorite',
        isLoading: false 
      })
      throw error
    }
  },

  // 즐겨찾기 제거 (ID로)
  removeFavorite: async (projectId, favoriteId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/projects/${projectId}/favorites/${favoriteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to remove favorite: ${response.statusText}`)
      }
      
      set(state => ({
        favorites: state.favorites.filter(f => f.id !== favoriteId),
        isLoading: false
      }))
    } catch (error) {
      console.error('Remove favorite error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove favorite',
        isLoading: false 
      })
      throw error
    }
  },

  // 즐겨찾기 제거 (타입과 대상 ID로)
  removeFavoriteByTarget: async (projectId, favoriteType, targetId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(
        `/api/projects/${projectId}/favorites?favorite_type=${favoriteType}&target_id=${targetId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to remove favorite: ${response.statusText}`)
      }
      
      set(state => ({
        favorites: state.favorites.filter(
          f => !(f.favorite_type === favoriteType && f.target_id === targetId)
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Remove favorite by target error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove favorite',
        isLoading: false 
      })
      throw error
    }
  },

  // 즐겨찾기 여부 확인
  isFavorite: (favoriteType, targetId) => {
    const { favorites } = get()
    return favorites.some(f => f.favorite_type === favoriteType && f.target_id === targetId)
  },

  // 즐겨찾기 토글 (추가/제거)
  toggleFavorite: async (projectId, favoriteType, targetId, targetName) => {
    const { isFavorite, addFavorite, removeFavoriteByTarget } = get()
    
    if (isFavorite(favoriteType, targetId)) {
      await removeFavoriteByTarget(projectId, favoriteType, targetId)
    } else {
      await addFavorite(projectId, {
        favorite_type: favoriteType,
        target_id: targetId,
        target_name: targetName
      })
    }
  },

  // 타입별 즐겨찾기 조회
  getFavoritesByType: (favoriteType) => {
    const { favorites } = get()
    return favorites.filter(f => f.favorite_type === favoriteType)
  },

  // 즐겨찾기 목록 초기화
  clearFavorites: () => {
    set({ favorites: [] })
  },

  // 스토어 완전 초기화
  reset: () => {
    set({
      favorites: [],
      isLoading: false,
      error: null,
      currentProjectId: null
    })
  }
}))

// 편의 함수들
export const useFavoritesByType = (favoriteType: FavoriteType) => {
  return useFavoriteStore(state => state.getFavoritesByType(favoriteType))
}

export const useIsFavorite = (favoriteType: FavoriteType, targetId: string) => {
  return useFavoriteStore(state => state.isFavorite(favoriteType, targetId))
}

export const useToggleFavorite = () => {
  const toggleFavorite = useFavoriteStore(state => state.toggleFavorite)
  const currentProjectId = useFavoriteStore(state => state.currentProjectId)
  
  return (favoriteType: FavoriteType, targetId: string, targetName: string) => {
    if (!currentProjectId) {
      throw new Error('No current project selected')
    }
    return toggleFavorite(currentProjectId, favoriteType, targetId, targetName)
  }
}
