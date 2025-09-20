import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
    })),
  },
}))

// Mock do React Router
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}))

// Mock do localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
})

// Mock do Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    permission: 'granted',
  },
  writable: true,
})

// Mock do Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(() => Promise.resolve({
      pushManager: {
        subscribe: vi.fn(() => Promise.resolve({
          endpoint: 'test-endpoint',
          getKey: vi.fn(() => new Uint8Array([1, 2, 3])),
        })),
        getSubscription: vi.fn(() => Promise.resolve(null)),
      },
    })),
    ready: Promise.resolve({
      pushManager: {
        subscribe: vi.fn(() => Promise.resolve({
          endpoint: 'test-endpoint',
          getKey: vi.fn(() => new Uint8Array([1, 2, 3])),
        })),
      },
    }),
    getRegistration: vi.fn(() => Promise.resolve(null)),
  },
  writable: true,
})

// Mock do PushManager
Object.defineProperty(window, 'PushManager', {
  value: {
    supportedContentEncodings: ['aesgcm'],
  },
  writable: true,
})
