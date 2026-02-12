import { derived, writable } from 'svelte/store'
import type { Milestone } from '../lib/types'
import { activeIssues } from './issues'
import { extractMilestones } from '../lib/layout'

export const milestones = derived(activeIssues, ($issues) => extractMilestones($issues))

export const collapsedMilestones = writable<Set<string>>(new Set(['Unscheduled']))

export function toggleMilestone(name: string) {
  collapsedMilestones.update((s) => {
    const next = new Set(s)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })
}
