<script lang="ts">
  import type { BarLayout } from '../../lib/types'
  import { BAR_HEIGHT } from '../../lib/layout'

  interface Props {
    from: BarLayout
    to: BarLayout
  }
  let { from, to }: Props = $props()

  const path = $derived.by(() => {
    const x1 = from.x + from.width
    const y1 = from.y + BAR_HEIGHT / 2
    const x2 = to.x
    const y2 = to.y + BAR_HEIGHT / 2

    const midX = x1 + (x2 - x1) * 0.5
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  })
</script>

<g class="dep-arrow" opacity="0.3">
  <path
    d={path}
    fill="none"
    stroke="var(--color-text-faint)"
    stroke-width="1.5"
    stroke-dasharray="4 2"
  />
  <circle cx={to.x} cy={to.y + BAR_HEIGHT / 2} r="3" fill="var(--color-text-faint)" />
</g>
