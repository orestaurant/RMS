'use client'

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'dark' | 'light'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
    if (document.documentElement.classList.contains('light')) {
      return 'light'
    }
    if (document.documentElement.classList.contains('dark')) {
      return 'dark'
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  } catch (e) {}
  return 'dark'
}

function applyThemeToDOM(t: Theme) {
  if (typeof document === 'undefined') return
  if (t === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Synchronize with DOM and localStorage
    const currentTheme = getInitialTheme()
    setTheme(currentTheme)
    applyThemeToDOM(currentTheme)

    const handleThemeChange = (e: CustomEvent<Theme>) => {
      const next = e.detail
      if (next === 'dark' || next === 'light') {
        setTheme(next)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        const next = e.newValue as Theme
        setTheme(next)
        applyThemeToDOM(next)
      }
    }

    window.addEventListener('theme-changed', handleThemeChange as EventListener)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    // Determine the next theme based on the current actual DOM state
    const isCurrentlyDark = document.documentElement.classList.contains('dark')
    const nextTheme: Theme = isCurrentlyDark ? 'light' : 'dark'

    applyThemeToDOM(nextTheme)
    setTheme(nextTheme)

    try {
      localStorage.setItem('theme', nextTheme)
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: nextTheme }))
  }, [])

  const setThemeExplicit = useCallback((newTheme: Theme) => {
    applyThemeToDOM(newTheme)
    setTheme(newTheme)

    try {
      localStorage.setItem('theme', newTheme)
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }))
  }, [])

  return { theme, toggleTheme, setTheme: setThemeExplicit, mounted }
}
