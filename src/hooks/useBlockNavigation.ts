import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Blocks in-app navigation (React Router) and browser close/refresh
 * when `shouldBlock` is true.
 *
 * NOTE: window.confirm() must NOT be called inside the blocker function —
 * doing so causes React Router to get stuck in "blocked" state in React 18
 * StrictMode (blank page + broken browser back). The correct pattern is to
 * react to the blocker state inside a useEffect.
 */
export function useBlockNavigation(shouldBlock: boolean, message: string) {
  // Block React Router in-app navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  )

  // Show confirm dialog once the blocker is in "blocked" state
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(message)) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker, message])

  // Block browser close / refresh
  useEffect(() => {
    if (!shouldBlock) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock, message])
}
