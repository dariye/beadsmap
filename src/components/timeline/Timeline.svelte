<script lang="ts">
  import type { Issue, Milestone, BarLayout } from '../../lib/types'
  import { computeLayout, dateToX, xToDate, BAR_HEIGHT } from '../../lib/layout'
  import { buildGraph } from '../../lib/graph'
  import { updateIssue, issueSourceMap, sources } from '../../stores/issues'
  import TimeAxis from './TimeAxis.svelte'
  import TodayLine from './TodayLine.svelte'
  import Bar from './Bar.svelte'
  import DepArrow from './DepArrow.svelte'
  import MilestoneRow from './MilestoneRow.svelte'
  import { collapsedMilestones, toggleMilestone } from '../../stores/milestones'
  import { viewport, zoomIn, zoomOut } from '../../stores/viewport'

  interface Props {
    milestones: Milestone[]
    onselect?: (issue: Issue) => void
  }
  let { milestones, onselect }: Props = $props()

  const multiSource = $derived($sources.length > 1)
  let containerEl: HTMLDivElement | undefined = $state()
  let containerWidth = $state(1200)

  $effect(() => {
    if (!containerEl) return
    const ro = new ResizeObserver((entries) => {
      containerWidth = entries[0].contentRect.width
    })
    ro.observe(containerEl)
    return () => ro.disconnect()
  })

  const displayMilestones = $derived(
    milestones.map((ms) => ({
      ...ms,
      collapsed: $collapsedMilestones.has(ms.name),
    }))
  )

  const layouts = $derived(computeLayout(displayMilestones, $viewport))

  const totalHeight = $derived(
    layouts.length > 0
      ? Math.max(...layouts.map((l) => l.y + BAR_HEIGHT + 20)) + 60
      : 400
  )

  // dependency arrows
  const depArrows = $derived.by(() => {
    const layoutMap = new Map(layouts.map((l) => [l.issue.id, l]))
    const arrows: { from: BarLayout; to: BarLayout }[] = []

    for (const ms of displayMilestones) {
      if (ms.collapsed) continue
      const { edges } = buildGraph(ms.issues)
      for (const edge of edges) {
        const from = layoutMap.get(edge.from)
        const to = layoutMap.get(edge.to)
        if (from && to) arrows.push({ from, to })
      }
    }
    return arrows
  })

  // milestone header y positions
  const milestonePositions = $derived.by(() => {
    const positions: { milestone: Milestone; y: number; collapsed: boolean }[] = []
    let currentY = 0

    for (const ms of displayMilestones) {
      positions.push({ milestone: ms, y: currentY, collapsed: ms.collapsed })
      currentY += 48
      if (!ms.collapsed) {
        const msLayouts = layouts.filter((l) => l.milestone === ms.name)
        if (msLayouts.length > 0) {
          const maxY = Math.max(...msLayouts.map((l) => l.y))
          currentY = maxY + BAR_HEIGHT + 16
        }
      }
    }
    return positions
  })

  // wheel zoom + horizontal scroll
  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) zoomIn()
      else zoomOut()
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // horizontal scroll → pan the timeline
      e.preventDefault()
      const daysDelta = (e.deltaX || e.deltaY) / $viewport.pixelsPerDay
      viewport.update((vp) => ({
        ...vp,
        startDate: new Date(vp.startDate.getTime() + daysDelta * 86400000),
        endDate: new Date(vp.endDate.getTime() + daysDelta * 86400000),
      }))
    }
  }

  // middle-click pan
  let panning = $state(false)
  let panStartX = $state(0)

  function handlePointerDown(e: PointerEvent) {
    // pan on middle click or direct background click
    const target = e.target as SVGElement
    const isBackground = target.tagName === 'svg' || target.classList.contains('time-axis-bg')
    if (e.button === 1 || (e.button === 0 && isBackground)) {
      if (e.button === 0 && !isBackground) return
      e.preventDefault()
      panning = true
      panStartX = e.clientX
      containerEl?.setPointerCapture(e.pointerId)
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!panning) return
    const dx = e.clientX - panStartX
    panStartX = e.clientX
    const daysDelta = -dx / $viewport.pixelsPerDay
    viewport.update((vp) => ({
      ...vp,
      startDate: new Date(vp.startDate.getTime() + daysDelta * 86400000),
      endDate: new Date(vp.endDate.getTime() + daysDelta * 86400000),
    }))
  }

  function handlePointerUp(e: PointerEvent) {
    if (panning) {
      panning = false
      containerEl?.releasePointerCapture(e.pointerId)
    }
  }

  // reschedule handler
  function handleReschedule(issue: Issue, daysDelta: number) {
    if (!issue.due_at) {
      // if no due date, set one relative to today
      const newDue = new Date()
      newDue.setDate(newDue.getDate() + daysDelta + 7)
      updateIssue(issue.id, { due_at: newDue.toISOString() })
    } else {
      const current = new Date(issue.due_at)
      current.setDate(current.getDate() + daysDelta)
      updateIssue(issue.id, { due_at: current.toISOString() })
    }
  }
</script>

<div
  class="relative flex-1 overflow-auto"
  class:cursor-grab={!panning}
  class:cursor-grabbing={panning}
  bind:this={containerEl}
  onwheel={handleWheel}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  role="application"
  aria-label="Timeline"
>
  <!-- milestone headers (HTML overlay) -->
  {#each milestonePositions as { milestone, y, collapsed }}
    <MilestoneRow
      {milestone} {y} {collapsed}
      viewport={$viewport}
      ontoggle={() => toggleMilestone(milestone.name)}
    />
  {/each}

  <!-- SVG timeline -->
  <svg
    width={containerWidth}
    height={totalHeight}
    class="block"
  >
    <!-- clickable background for panning -->
    <rect class="time-axis-bg" width={containerWidth} height={totalHeight} fill="transparent" />

    <TimeAxis viewport={$viewport} width={containerWidth} />
    <TodayLine viewport={$viewport} height={totalHeight} />

    <!-- dependency arrows (behind bars) -->
    {#each depArrows as arrow}
      <DepArrow from={arrow.from} to={arrow.to} />
    {/each}

    <!-- issue bars -->
    {#each layouts as layout}
      <Bar
        issue={layout.issue}
        x={layout.x}
        y={layout.y}
        width={layout.width}
        pixelsPerDay={$viewport.pixelsPerDay}
        sourceColor={multiSource ? $issueSourceMap.get(layout.issue.id)?.color : undefined}
        {onselect}
        onreschedule={handleReschedule}
      />
    {/each}
  </svg>
</div>
