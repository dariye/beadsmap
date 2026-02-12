<script lang="ts">
  import type { ViewportState } from '../../lib/types'
  import { dateToX } from '../../lib/layout'

  interface Props {
    viewport: ViewportState
    height: number
  }
  let { viewport, height }: Props = $props()

  const x = $derived(dateToX(new Date(), viewport))
</script>

{#if x > 0}
  <g class="today-line">
    <line
      x1={x} y1={28} x2={x} y2={height}
      stroke="var(--color-accent)"
      stroke-width="1.5"
      stroke-dasharray="4 3"
      opacity="0.5"
    />
    <rect x={x - 20} y={20} width="40" height="16" rx="4" fill="var(--color-accent)" />
    <text x={x} y={31} text-anchor="middle" style="font-size: 9px; font-weight: 600" fill="var(--color-bar-text)">
      today
    </text>
  </g>
{/if}
