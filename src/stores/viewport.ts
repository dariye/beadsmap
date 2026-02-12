import { writable, derived } from 'svelte/store'
import type { ViewportState } from '../lib/types'
import { defaultViewport } from '../lib/layout'

export const viewport = writable<ViewportState>(defaultViewport())

export const timeRange = derived(viewport, ($vp) => ({
  start: $vp.startDate,
  end: $vp.endDate,
  days: Math.ceil(($vp.endDate.getTime() - $vp.startDate.getTime()) / 86400000),
}))

export function zoomIn() {
  viewport.update((vp) => ({
    ...vp,
    pixelsPerDay: Math.min(vp.pixelsPerDay * 1.3, 80),
  }))
}

export function zoomOut() {
  viewport.update((vp) => ({
    ...vp,
    pixelsPerDay: Math.max(vp.pixelsPerDay / 1.3, 4),
  }))
}

export function panTo(date: Date) {
  viewport.update((vp) => {
    const rangeDays = (vp.endDate.getTime() - vp.startDate.getTime()) / 86400000
    const newStart = new Date(date.getTime() - (rangeDays / 4) * 86400000)
    const newEnd = new Date(newStart.getTime() + rangeDays * 86400000)
    return { ...vp, startDate: newStart, endDate: newEnd }
  })
}

export function setRange(weeks: number) {
  viewport.update((vp) => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    const end = new Date(now)
    end.setDate(end.getDate() + weeks * 7)
    return { ...vp, startDate: start, endDate: end }
  })
}
