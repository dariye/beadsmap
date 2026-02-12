import { writable } from 'svelte/store'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'beadsmap-theme'

function getInitial(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
}

export const theme = writable<Theme>(getInitial())

export function applyTheme(t: Theme) {
  const el = document.documentElement
  el.classList.remove('dark', 'system')
  if (t === 'dark') el.classList.add('dark')
  else if (t === 'system') el.classList.add('system')
  // light = no class (default)
  localStorage.setItem(STORAGE_KEY, t)
}

export function cycleTheme() {
  theme.update((t) => {
    const next = t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light'
    applyTheme(next)
    return next
  })
}

// apply on load
theme.subscribe(applyTheme)
