<script lang="ts">
  import type { Milestone, ViewportState } from '../../lib/types'
  import Progress from '../ui/Progress.svelte'

  interface Props {
    milestone: Milestone
    y: number
    viewport: ViewportState
    collapsed: boolean
    ontoggle?: () => void
  }
  let { milestone, y, viewport, collapsed, ontoggle }: Props = $props()

  const isOverdue = $derived(
    milestone.due_at && milestone.due_at < new Date() && milestone.progress < 1
  )
</script>

<div
  class="ms-row"
  style="top: {y}px"
  onclick={ontoggle}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && ontoggle?.()}
>
  <span class="ms-chevron">{collapsed ? '▸' : '▾'}</span>

  <span class="ms-name">{milestone.name}</span>

  <div class="ms-progress">
    <Progress value={milestone.progress} />
  </div>

  <span class="ms-counts">
    {milestone.counts.done} done · {milestone.counts.open + milestone.counts.in_progress} open
    {#if milestone.counts.blocked > 0}
      · <span class="ms-blocked">{milestone.counts.blocked} blocked</span>
    {/if}
  </span>

  {#if milestone.due_at}
    <span class="ms-due" class:ms-overdue={isOverdue}>
      due {milestone.due_at.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
    </span>
  {/if}
</div>

<style>
  .ms-row {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    height: 40px;
    border-bottom: 1px solid var(--color-border-subtle);
    background: var(--color-surface);
    cursor: pointer;
    user-select: none;
    z-index: 5;
  }
  .ms-row:hover { background: var(--color-surface-2); }
  .ms-chevron { color: var(--color-text-faint); font-size: 11px; width: 12px; }
  .ms-name { font-size: 13px; font-weight: 600; color: var(--color-text); }
  .ms-progress { width: 120px; }
  .ms-counts { font-size: 11px; color: var(--color-text-faint); }
  .ms-blocked { color: var(--color-blocked); }
  .ms-due { font-size: 11px; color: var(--color-text-faint); margin-left: auto; }
  .ms-overdue { color: var(--color-risk); }
</style>
