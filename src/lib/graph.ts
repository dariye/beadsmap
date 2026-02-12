import type { Issue } from './types'

const BLOCKING_TYPES = new Set(['blocks', 'parent-child', 'conditional-blocks', 'waits-for'])

export interface DepEdge {
  from: string // blocker
  to: string   // blocked
}

export function buildGraph(issues: Issue[]): {
  edges: DepEdge[]
  blockers: Map<string, string[]>  // issue → issues that block it
  blocked: Map<string, string[]>   // issue → issues it blocks
} {
  const issueIds = new Set(issues.map((i) => i.id))
  const edges: DepEdge[] = []
  const blockers = new Map<string, string[]>()
  const blocked = new Map<string, string[]>()

  for (const issue of issues) {
    for (const dep of issue.dependencies) {
      if (!BLOCKING_TYPES.has(dep.type)) continue
      if (!issueIds.has(dep.target)) continue

      // dep.type = 'blocks' means dep.target blocks this issue
      edges.push({ from: dep.target, to: issue.id })

      const b = blockers.get(issue.id) ?? []
      b.push(dep.target)
      blockers.set(issue.id, b)

      const d = blocked.get(dep.target) ?? []
      d.push(issue.id)
      blocked.set(dep.target, d)
    }
  }

  return { edges, blockers, blocked }
}

export function topoSort(issues: Issue[], edges: DepEdge[]): Issue[] {
  const issueMap = new Map(issues.map((i) => [i.id, i]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const issue of issues) {
    inDegree.set(issue.id, 0)
    adj.set(issue.id, [])
  }

  for (const { from, to } of edges) {
    adj.get(from)?.push(to)
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: Issue[] = []
  while (queue.length > 0) {
    // sort by priority within same level
    queue.sort((a, b) => (issueMap.get(a)!.priority ?? 2) - (issueMap.get(b)!.priority ?? 2))
    const id = queue.shift()!
    const issue = issueMap.get(id)
    if (issue) sorted.push(issue)

    for (const next of adj.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(next)
    }
  }

  // append any remaining (cycles) at the end
  for (const issue of issues) {
    if (!sorted.find((s) => s.id === issue.id)) {
      sorted.push(issue)
    }
  }

  return sorted
}

export function findCriticalPath(
  issues: Issue[],
  edges: DepEdge[],
): string[] {
  const issueMap = new Map(issues.map((i) => [i.id, i]))
  const sorted = topoSort(issues, edges)

  // longest path via estimated_minutes (or 60 min default)
  const dist = new Map<string, number>()
  const prev = new Map<string, string>()
  const adj = new Map<string, string[]>()

  for (const issue of sorted) {
    dist.set(issue.id, 0)
    adj.set(issue.id, [])
  }
  for (const { from, to } of edges) {
    adj.get(from)?.push(to)
  }

  for (const issue of sorted) {
    const d = dist.get(issue.id)!
    const duration = issue.estimated_minutes ?? 60
    for (const next of adj.get(issue.id) ?? []) {
      const newDist = d + duration
      if (newDist > (dist.get(next) ?? 0)) {
        dist.set(next, newDist)
        prev.set(next, issue.id)
      }
    }
  }

  // find the end of the critical path
  let maxId = sorted[0]?.id ?? ''
  let maxDist = 0
  for (const [id, d] of dist) {
    const duration = issueMap.get(id)?.estimated_minutes ?? 60
    if (d + duration > maxDist) {
      maxDist = d + duration
      maxId = id
    }
  }

  // trace back
  const path: string[] = [maxId]
  let current = maxId
  while (prev.has(current)) {
    current = prev.get(current)!
    path.unshift(current)
  }

  return path
}
