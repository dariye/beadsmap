import { writable, derived } from 'svelte/store'
import type { Issue } from '../lib/types'
import { rawIssues } from './issues'

export type ViewMode = 'timeline' | 'list' | 'table'

const STORAGE_KEY = 'beadsmap-view'

function getStored(): ViewMode | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY) as ViewMode | null
}

export const viewMode = writable<ViewMode>(getStored() ?? 'list')

viewMode.subscribe((v) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, v)
})

// auto-detect best view based on data shape
export const suggestedView = derived(rawIssues, ($issues) => {
  if ($issues.length === 0) return 'list' as ViewMode
  const withDates = $issues.filter((i) => i.due_at).length
  const withMilestones = $issues.filter((i) => i.labels.some((l) => l.startsWith('milestone:'))).length
  const ratio = (withDates + withMilestones) / $issues.length

  if (ratio > 0.3) return 'timeline' as ViewMode
  return 'list' as ViewMode
})
