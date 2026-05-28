'use client'

import { useState, useEffect } from 'react'

export function useWindowSize() {
  const isServer = typeof window === 'undefined'
  const [width, setWidth] = useState(isServer ? 1280 : window.innerWidth)

  useEffect(() => {
    if (isServer) return
    let rafId: number | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const update = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth))
    }
    const debounced = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(update, 80)
    }
    window.addEventListener('resize', debounced)
    return () => {
      window.removeEventListener('resize', debounced)
      if (rafId) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isServer])

  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  }
}
