import { useEffect, useRef, useState } from 'react'

export function useWordReveal(totalWords: number) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      setActiveCount(totalWords)
      return
    }

    let frame = 0

    const update = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const viewport = window.innerHeight
      const start = viewport * 0.82
      const end = viewport * 0.28
      const progress = (start - rect.top) / (start - end + rect.height * 0.3)
      const next = Math.max(
        0,
        Math.min(totalWords, Math.ceil(progress * totalWords)),
      )
      setActiveCount((current) => (current === next ? current : next))
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [totalWords])

  return { ref, activeCount }
}
