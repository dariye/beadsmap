import type { Issue, Milestone, BarLayout, ViewportState } from './types'
import { buildGraph, topoSort } from './graph'

const MILESTONE_LABEL_PREFIX = 'milestone:'
const BAR_HEIGHT = 32
const BAR_GAP = 8
const LANE_HEIGHT = BAR_HEIGHT + BAR_GAP
const DEFAULT_BAR_DAYS = 7

export function extractMilestones(issues: Issue[]): Milestone[] {
  const milestoneMap = new Map<string, { due_at?: Date; issues: Issue[] }>()
  const unscheduled: Issue[] = []

  for (const issue of issues) {
    // skip closed issues unless they have a milestone
    const milestoneLabel = issue.labels.find((l) => l.startsWith(MILESTONE_LABEL_PREFIX))

    if (milestoneLabel) {
      const name = milestoneLabel.slice(MILESTONE_LABEL_PREFIX.length)
      const entry = milestoneMap.get(name) ?? { issues: [] }

      // if this is an epic with due_at, use it as milestone due date
      if (issue.issue_type === 'epic' && issue.due_at) {
        entry.due_at = new Date(issue.due_at)
      }

      entry.issues.push(issue)
      milestoneMap.set(name, entry)
    } else {
      unscheduled.push(issue)
    }
  }

  const milestones: Milestone[] = []

  for (const [name, { due_at, issues: msIssues }] of milestoneMap) {
    const counts = countStatuses(msIssues)
    const total = msIssues.length
    milestones.push({
      name,
      due_at,
      issues: msIssues,
      progress: total > 0 ? counts.done / total : 0,
      counts,
      collapsed: false,
    })
  }

  // sort by due date, then name
  milestones.sort((a, b) => {
    if (a.due_at && b.due_at) return a.due_at.getTime() - b.due_at.getTime()
    if (a.due_at) return -1
    if (b.due_at) return 1
    return a.name.localeCompare(b.name)
  })

  // add unscheduled at the end
  if (unscheduled.length > 0) {
    milestones.push({
      name: 'Unscheduled',
      issues: unscheduled,
      progress: countStatuses(unscheduled).done / unscheduled.length,
      counts: countStatuses(unscheduled),
      collapsed: true,
    })
  }

  return milestones
}

function countStatuses(issues: Issue[]) {
  const counts = { done: 0, in_progress: 0, open: 0, blocked: 0 }
  for (const issue of issues) {
    if (issue.status === 'closed') counts.done++
    else if (issue.status === 'in_progress' || issue.status === 'hooked') counts.in_progress++
    else if (issue.status === 'blocked') counts.blocked++
    else counts.open++
  }
  return counts
}

export function computeLayout(
  milestones: Milestone[],
  viewport: ViewportState,
): BarLayout[] {
  const layouts: BarLayout[] = []
  let currentY = 0

  for (const ms of milestones) {
    // skip header space
    currentY += 48

    if (ms.collapsed) {
      continue
    }

    const allIssues = ms.issues.filter((i) => i.status !== 'closed' || ms.name !== 'Unscheduled')
    const { edges } = buildGraph(allIssues)
    const sorted = topoSort(allIssues, edges)

    for (let i = 0; i < sorted.length; i++) {
      const issue = sorted[i]
      const x = dateToX(getIssueStart(issue), viewport)
      const days = issue.estimated_minutes
        ? Math.max(1, Math.ceil(issue.estimated_minutes / 480)) // 8hr days
        : DEFAULT_BAR_DAYS
      const width = days * viewport.pixelsPerDay

      layouts.push({
        issue,
        x,
        y: currentY + i * LANE_HEIGHT,
        width: Math.max(width, 40), // minimum visible width
        lane: i,
        milestone: ms.name,
      })
    }

    currentY += sorted.length * LANE_HEIGHT + 16
  }

  return layouts
}

function getIssueStart(issue: Issue): Date {
  if (issue.due_at) {
    const due = new Date(issue.due_at)
    const days = issue.estimated_minutes
      ? Math.ceil(issue.estimated_minutes / 480)
      : DEFAULT_BAR_DAYS
    return new Date(due.getTime() - days * 86400000)
  }
  // fallback: use created_at
  return new Date(issue.created_at)
}

export function dateToX(date: Date, viewport: ViewportState): number {
  const days = (date.getTime() - viewport.startDate.getTime()) / 86400000
  return days * viewport.pixelsPerDay
}

export function xToDate(x: number, viewport: ViewportState): Date {
  const days = x / viewport.pixelsPerDay
  return new Date(viewport.startDate.getTime() + days * 86400000)
}

export function defaultViewport(): ViewportState {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 7) // 1 week before now
  const end = new Date(now)
  end.setDate(end.getDate() + 56) // 8 weeks ahead

  return {
    startDate: start,
    endDate: end,
    pixelsPerDay: 16,
    scrollX: 0,
    scrollY: 0,
  }
}

export { BAR_HEIGHT, BAR_GAP, LANE_HEIGHT }
