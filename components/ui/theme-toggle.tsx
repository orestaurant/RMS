'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isLight = document.documentElement.classList.contains('light')
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || (!stored && isLight)) {
      setTheme('light')
    } else {
      setTheme('dark')
    }

    const handleThemeChange = (e: CustomEvent<string>) => {
      setTheme(e.detail === 'light' ? 'light' : 'dark')
    }

    window.addEventListener('theme-changed', handleThemeChange as EventListener)
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)

    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      try {
        localStorage.setItem('theme', 'light')
      } catch (e) {}
    } else {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      try {
        localStorage.setItem('theme', 'dark')
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: nextTheme }))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
      title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
      className={`relative inline-flex items-center justify-center p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/40 active:scale-95 cursor-pointer ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
        <Sun className="w-4 h-4 text-amber-500 transition-all duration-300 transform rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-0 dark:opacity-0" />
        <Moon className="w-4 h-4 text-orange-400 absolute transition-all duration-300 transform rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100" />
      </div>
      {showLabel && (
        <span className="hidden lg:inline text-[11px] font-semibold text-slate-700 dark:text-slate-300 select-none ml-1">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  )
}

