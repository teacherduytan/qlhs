import { type ReactNode, useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 70
const MAX_PULL = 110
const RESISTANCE = 0.5

export function PullToRefresh({ children }: { children: ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)

  useEffect(() => {
    function handleTouchStart(event: TouchEvent) {
      if (refreshing || window.scrollY > 0) return
      startY.current = event.touches[0].clientY
      pulling.current = true
    }

    function handleTouchMove(event: TouchEvent) {
      if (!pulling.current || startY.current === null || refreshing) return

      if (window.scrollY > 0) {
        pulling.current = false
        setPullDistance(0)
        return
      }

      const delta = event.touches[0].clientY - startY.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }

      if (event.cancelable) event.preventDefault()
      setPullDistance(Math.min(delta * RESISTANCE, MAX_PULL))
    }

    function handleTouchEnd() {
      if (!pulling.current) return
      pulling.current = false
      startY.current = null

      setPullDistance((current) => {
        if (current >= PULL_THRESHOLD) {
          setRefreshing(true)
          window.location.reload()
          return PULL_THRESHOLD
        }
        return 0
      })
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [refreshing])

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const showIndicator = pullDistance > 0 || refreshing

  return (
    <>
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: showIndicator ? Math.max(pullDistance, refreshing ? 48 : 0) : 0 }}
      >
        <div className="flex flex-col items-center gap-1 py-2 text-slate-500">
          <span
            className={`text-xl ${refreshing ? 'animate-spin' : ''}`}
            style={!refreshing ? { transform: `rotate(${progress * 180}deg)` } : undefined}
            aria-hidden="true"
          >
            {refreshing ? '↻' : '↓'}
          </span>
          <span className="text-xs font-medium">
            {refreshing ? 'Đang làm mới...' : progress >= 1 ? 'Thả để làm mới' : 'Kéo xuống để làm mới'}
          </span>
        </div>
      </div>
      <div
        className="transition-transform duration-150"
        style={{ transform: refreshing ? undefined : `translateY(${pullDistance > 0 ? pullDistance * 0.3 : 0}px)` }}
      >
        {children}
      </div>
    </>
  )
}
