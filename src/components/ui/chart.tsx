import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartSize {
  width: number
  height: number
}

interface ChartFrameProps {
  children: (size: ChartSize) => ReactNode
  className?: string
}

export function ChartFrame({ children, className }: ChartFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      setSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    if (typeof ResizeObserver === 'undefined') {
      const frame = requestAnimationFrame(updateSize)
      return () => cancelAnimationFrame(frame)
    }

    const frame = requestAnimationFrame(updateSize)
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('min-w-0', className)}>
      {size.width > 0 && size.height > 0 ? (
        children(size)
      ) : (
        <div className="h-full w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      )}
    </div>
  )
}
