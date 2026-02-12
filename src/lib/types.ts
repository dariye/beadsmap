export interface Issue {
  id: string
  title: string
  description?: string
  status: 'open' | 'in_progress' | 'blocked' | 'closed' | 'deferred' | 'hooked'
  priority: number
  issue_type: 'bug' | 'feature' | 'task' | 'epic' | 'chore' | 'event'
  assignee?: string
  owner?: string
  labels: string[]
  dependencies: Dependency[]
  due_at?: string
  defer_until?: string
  estimated_minutes?: number
  created_at: string
  updated_at: string
  closed_at?: string
  external_ref?: string
}

export interface Dependency {
  target: string
  type: 'blocks' | 'parent-child' | 'related' | 'conditional-blocks' | 'waits-for' | 'discovered-from'
}

export interface Milestone {
  name: string
  due_at?: Date
  issues: Issue[]
  progress: number
  counts: { done: number; in_progress: number; open: number; blocked: number }
  collapsed: boolean
}

export interface ViewportState {
  startDate: Date
  endDate: Date
  pixelsPerDay: number
  scrollX: number
  scrollY: number
}

export interface BarLayout {
  issue: Issue
  x: number
  y: number
  width: number
  lane: number
  milestone: string
}
