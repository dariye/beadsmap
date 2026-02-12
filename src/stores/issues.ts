import { writable, derived, get } from 'svelte/store'
import type { Issue } from '../lib/types'
import { parseJSONL } from '../lib/parser'

const SOURCES_KEY = 'beadsmap-sources'

export interface IssueSource {
  key: string       // unique id, e.g. "github:owner/repo" or "file:filename"
  label: string     // display label
  repo?: string     // "owner/repo" for GitHub sources
  sha?: string      // file sha for GitHub sync
  issues: Issue[]
}

function loadStoredSources(): IssueSource[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(SOURCES_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function persistSources(sources: IssueSource[]) {
  if (typeof localStorage === 'undefined') return
  if (sources.length > 0) {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources))
  } else {
    localStorage.removeItem(SOURCES_KEY)
  }
}

export const sources = writable<IssueSource[]>(loadStoredSources())

// auto-persist
sources.subscribe(($sources) => persistSources($sources))

// merged view of all issues across all sources, tagged with source key
export const rawIssues = derived(sources, ($sources) =>
  $sources.flatMap((s) => s.issues)
)

export const sourceLabels = derived(sources, ($sources) =>
  $sources.map((s) => s.label)
)

// back-compat: single source label
export const sourceLabel = derived(sources, ($sources) =>
  $sources.map((s) => s.label).join(', ')
)

export const SOURCE_COLORS = ['#6366f1', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6']

export const issueSourceMap = derived(sources, ($sources) => {
  const map = new Map<string, { key: string; label: string; idx: number; color: string }>()
  $sources.forEach((s, idx) => {
    const color = SOURCE_COLORS[idx % SOURCE_COLORS.length]
    for (const i of s.issues) {
      map.set(i.id, { key: s.key, label: s.label, idx, color })
    }
  })
  return map
})

export const activeIssues = derived(rawIssues, ($issues) =>
  $issues.filter((i) => i.status !== 'closed' || hasRecentClose(i))
)

export const allIssues = derived(rawIssues, ($issues) => $issues)

export const hasData = derived(rawIssues, ($issues) => $issues.length > 0)

function hasRecentClose(issue: Issue): boolean {
  if (!issue.closed_at) return false
  const closed = new Date(issue.closed_at)
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  return closed > weekAgo
}

// --- Add / replace a source ---

export function addSource(source: IssueSource) {
  sources.update(($sources) => {
    const idx = $sources.findIndex((s) => s.key === source.key)
    if (idx >= 0) {
      // replace
      const updated = [...$sources]
      updated[idx] = source
      return updated
    }
    return [...$sources, source]
  })
}

export function removeSource(key: string) {
  sources.update(($sources) => $sources.filter((s) => s.key !== key))
}

export function getSource(key: string): IssueSource | undefined {
  return get(sources).find((s) => s.key === key)
}

// --- Load from JSONL (adds/replaces a source) ---

export function loadFromJSONL(text: string, key?: string, label?: string) {
  const issues = parseJSONL(text)
  const sourceKey = key ?? `file:${Date.now()}`
  const sourceLabel = label ?? 'Loaded file'
  addSource({ key: sourceKey, label: sourceLabel, issues })
}

// --- Update issue (across sources) ---

export function updateIssue(id: string, changes: Partial<Issue>) {
  sources.update(($sources) =>
    $sources.map((s) => ({
      ...s,
      issues: s.issues.map((i) =>
        i.id === id ? { ...i, ...changes, updated_at: new Date().toISOString() } : i
      ),
    }))
  )
}

export function updateIssues(ids: string[], changes: Partial<Issue>) {
  const idSet = new Set(ids)
  sources.update(($sources) =>
    $sources.map((s) => ({
      ...s,
      issues: s.issues.map((i) =>
        idSet.has(i.id) ? { ...i, ...changes, updated_at: new Date().toISOString() } : i
      ),
    }))
  )
}

// --- Export ---

export function exportJSONL(): string {
  return get(rawIssues).map((i) => JSON.stringify(i)).join('\n')
}

export function exportSourceJSONL(key: string): string {
  const source = getSource(key)
  if (!source) return ''
  return source.issues.map((i) => JSON.stringify(i)).join('\n')
}

// --- Clear ---

export function clearData() {
  sources.set([])
  localStorage.removeItem(SOURCES_KEY)
}

export function clearSource(key: string) {
  removeSource(key)
}
