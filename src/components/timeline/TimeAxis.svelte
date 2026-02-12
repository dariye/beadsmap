<script lang="ts">
  import type { ViewportState } from '../../lib/types'
  import { dateToX } from '../../lib/layout'

  interface Props {
    viewport: ViewportState
    width: number
  }
  let { viewport, width }: Props = $props()

  interface Tick {
    x: number
    label: string
    isMonth: boolean
  }

  const ticks = $derived.by(() => {
    const result: Tick[] = []
    const d = new Date(viewport.startDate)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))

    const months = new Set<string>()

    while (d <= viewport.endDate) {
      const x = dateToX(d, viewport)
      if (x >= 0 && x <= width) {
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`
        const isMonth = !months.has(monthKey)
        if (isMonth) months.add(monthKey)

        result.push({
          x,
          label: isMonth
            ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
            : d.toLocaleDateString('en', { day: 'numeric' }),
          isMonth,
        })
      }
      d.setDate(d.getDate() + 7)
    }
    return result
  })

  const monthLabels = $derived.by(() => {
    const result: { x: number; label: string }[] = []
    const d = new Date(viewport.startDate)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)

    while (d <= viewport.endDate) {
      const x = dateToX(d, viewport)
      if (x >= 0 && x <= width) {
        result.push({
          x,
          label: d.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
        })
      }
      d.setMonth(d.getMonth() + 1)
    }
    return result
  })
</script>

<g class="time-axis">
  {#each monthLabels as m}
    <text x={m.x + 4} y={16} fill="var(--color-text-muted)" style="font-size: 12px; font-weight: 500">
      {m.label}
    </text>
  {/each}

  {#each ticks as tick}
    <line
      x1={tick.x} y1={28} x2={tick.x} y2={5000}
      stroke={tick.isMonth ? 'var(--color-grid-strong)' : 'var(--color-grid)'}
      stroke-width="1"
    />
    <text x={tick.x + 3} y={38} fill="var(--color-text-faint)" style="font-size: 10px">
      {tick.label}
    </text>
  {/each}
</g>
