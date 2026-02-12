<script lang="ts">
  import type { Issue } from '../../lib/types'
  import { BAR_HEIGHT } from '../../lib/layout'
  import { draggable } from '../../actions/draggable'

  interface Props {
    issue: Issue
    x: number
    y: number
    width: number
    pixelsPerDay: number
    sourceColor?: string
    onselect?: (issue: Issue) => void
    onreschedule?: (issue: Issue, daysDelta: number) => void
  }
  let { issue, x, y, width, pixelsPerDay, sourceColor, onselect, onreschedule }: Props = $props()

  const statusFill: Record<string, string> = {
    closed: 'var(--color-done)',
    in_progress: 'var(--color-accent)',
    hooked: 'var(--color-accent)',
    blocked: 'var(--color-blocked)',
    open: 'var(--color-open)',
    deferred: 'var(--color-open)',
  }

  const fill = $derived(statusFill[issue.status] ?? 'var(--color-open)')
  const displayWidth = $derived(Math.max(width, 6))
  const maxChars = $derived(Math.max(0, Math.floor((displayWidth - 16) / 6.5)))
  const label = $derived(
    issue.title.length > maxChars ? issue.title.slice(0, maxChars) + '…' : issue.title
  )

  const priorityMarker = $derived(
    issue.priority === 0 ? '!!! ' :
    issue.priority === 1 ? '!! ' : ''
  )

  let hovering = $state(false)
  let dragOffsetX = $state(0)
  let isDragging = $state(false)

  const dragDays = $derived(Math.round(dragOffsetX / pixelsPerDay))

  function handleDragStart() {
    isDragging = true
    dragOffsetX = 0
  }

  function handleDrag(dx: number) {
    dragOffsetX = dx
  }

  function handleDragEnd(dx: number) {
    isDragging = false
    const days = Math.round(dx / pixelsPerDay)
    dragOffsetX = 0
    if (days !== 0) {
      onreschedule?.(issue, days)
    }
  }

  function handleClick() {
    if (!isDragging) onselect?.(issue)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<g
  class="bar"
  style="cursor: {isDragging ? 'grabbing' : 'pointer'}"
  transform="translate({x + dragOffsetX}, {y})"
  onmouseenter={() => (hovering = true)}
  onmouseleave={() => (hovering = false)}
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && onselect?.(issue)}
  use:draggable={{
    axis: 'x',
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
  }}
>
  <!-- drag ghost -->
  {#if isDragging && dragDays !== 0}
    <rect
      x={-dragOffsetX} y={0}
      width={displayWidth} height={BAR_HEIGHT}
      rx="6" fill="none"
      stroke="var(--color-border)" stroke-width="1" stroke-dasharray="4 2"
    />
    <text
      x={displayWidth / 2} y={-6}
      text-anchor="middle"
      style="font-size: 10px; font-weight: 600"
      fill={dragDays > 0 ? 'var(--color-blocked)' : 'var(--color-done)'}
      class="pointer-events-none"
    >
      {dragDays > 0 ? '+' : ''}{dragDays}d
    </text>
  {/if}

  <!-- hover ring -->
  {#if hovering && !isDragging}
    <rect
      x="-1" y="-1"
      width={displayWidth + 2} height={BAR_HEIGHT + 2}
      rx="7" fill="none"
      stroke="var(--color-accent)" stroke-width="1.5" opacity="0.5"
    />
  {/if}

  <!-- bar body -->
  <rect
    width={displayWidth} height={BAR_HEIGHT}
    rx="6" fill={fill}
    opacity={isDragging ? 0.95 : issue.status === 'closed' ? 0.5 : 0.85}
  />

  <!-- source stripe -->
  {#if sourceColor}
    <rect
      x="0" y={BAR_HEIGHT - 3}
      width={displayWidth} height="3"
      rx="0" fill={sourceColor}
      opacity="0.6"
      class="pointer-events-none"
    />
  {/if}

  <!-- label -->
  {#if maxChars > 2}
    <text
      x="8" y={BAR_HEIGHT / 2 + 1}
      dominant-baseline="middle"
      style="font-size: 11px; font-weight: 500"
      fill="var(--color-bar-text)"
      class="pointer-events-none select-none"
    >
      {#if priorityMarker}
        <tspan fill="var(--color-blocked)" style="font-size: 10px">{priorityMarker}</tspan>
      {/if}
      {label}
    </text>
  {/if}

  <title>{issue.id}: {issue.title} ({issue.status})</title>
</g>
