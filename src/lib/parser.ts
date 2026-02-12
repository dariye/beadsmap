import type { Issue, Dependency } from './types'

export function parseJSONL(text: string): Issue[] {
  const issues: Issue[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const raw = JSON.parse(trimmed)
      if (raw.status === 'tombstone') continue
      issues.push(normalizeIssue(raw))
    } catch {
      // skip malformed lines
    }
  }
  return issues
}

function normalizeIssue(raw: Record<string, unknown>): Issue {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Untitled'),
    description: raw.description as string | undefined,
    status: normalizeStatus(raw.status),
    priority: typeof raw.priority === 'number' ? raw.priority : 2,
    issue_type: normalizeType(raw.issue_type),
    assignee: raw.assignee as string | undefined,
    owner: raw.owner as string | undefined,
    labels: Array.isArray(raw.labels) ? raw.labels.map(String) : [],
    dependencies: normalizeDeps(raw.dependencies),
    due_at: raw.due_at as string | undefined,
    defer_until: raw.defer_until as string | undefined,
    estimated_minutes: raw.estimated_minutes as number | undefined,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
    closed_at: raw.closed_at as string | undefined,
    external_ref: raw.external_ref as string | undefined,
  }
}

function normalizeStatus(s: unknown): Issue['status'] {
  const valid = ['open', 'in_progress', 'blocked', 'closed', 'deferred', 'hooked']
  return valid.includes(String(s)) ? (String(s) as Issue['status']) : 'open'
}

function normalizeType(t: unknown): Issue['issue_type'] {
  const valid = ['bug', 'feature', 'task', 'epic', 'chore', 'event']
  return valid.includes(String(t)) ? (String(t) as Issue['issue_type']) : 'task'
}

function normalizeDeps(deps: unknown): Dependency[] {
  if (!Array.isArray(deps)) return []
  return deps
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object')
    .map((d) => ({
      target: String(d.target ?? ''),
      type: (d.type as Dependency['type']) ?? 'related',
    }))
    .filter((d) => d.target !== '')
}
