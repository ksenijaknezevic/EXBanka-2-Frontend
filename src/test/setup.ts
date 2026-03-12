import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// Silence expected console errors in tests
vi.spyOn(console, 'error').mockImplementation(() => undefined)
