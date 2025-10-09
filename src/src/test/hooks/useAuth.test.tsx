import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return initial state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('should handle sign in', async () => {
    const mockUser = { id: '1', email: 'test@example.com' }
    const mockSignIn = vi.mocked(supabase.auth.signInWithPassword)
    mockSignIn.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password')
    })
    
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('should handle sign up', async () => {
    const mockUser = { id: '1', email: 'test@example.com' }
    const mockSignUp = vi.mocked(supabase.auth.signUp)
    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.signUp('test@example.com', 'password')
    })
    
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('should handle sign out', async () => {
    const mockSignOut = vi.mocked(supabase.auth.signOut)
    mockSignOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.signOut()
    })
    
    expect(mockSignOut).toHaveBeenCalled()
  })
})
