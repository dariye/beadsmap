<script lang="ts">
  import type { Issue } from '../lib/types'
  import Badge from './ui/Badge.svelte'

  interface Props {
    issues: Issue[]
    onselect?: (issue: Issue) => void
  }
  let { issues, onselect }: Props = $props()

  // only show unscheduled, non-closed
  const backlog = $derived(
    issues
      .filter((i) => !i.due_at && i.status !== 'closed' && !i.labels.some((l) => l.startsWith('milestone:')))
      .sort((a, b) => a.priority - b.priority)
  )

  const byPriority = $derived.by(() => {
    const groups: { label: string; issues: Issue[] }[] = []
    const map = new Map<number, Issue[]>()
    for (const i of backlog) {
      const arr = map.get(i.priority) ?? []
      arr.push(i)
      map.set(i.priority, arr)
    }
    const labels: Record<number, string> = { 0: 'P0 Critical', 1: 'P1 High', 2: 'P2 Normal', 3: 'P3 Low', 4: 'P4 Lowest' }
    for (const [p, iss] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
      groups.push({ label: labels[p] ?? `P${p}`, issues: iss })
    }
    return groups
  })

  let collapsed = $state<Set<number>>(new Set())
  function toggle(idx: number) {
    collapsed = new Set(collapsed)
    if (collapsed.has(idx)) collapsed.delete(idx)
    else collapsed.add(idx)
  }
</script>

<aside class="backlog">
  <div class="backlog-header">
    <span class="backlog-title">Backlog</span>
    <span class="backlog-count">{backlog.length}</span>
  </div>

  {#if backlog.length === 0}
    <div class="backlog-empty">All issues scheduled</div>
  {:else}
    <div class="backlog-list">
      {#each byPriority as group, idx}
        <button class="bp-header" onclick={() => toggle(idx)}>
          <span class="bp-chevron">{collapsed.has(idx) ? '▸' : '▾'}</span>
          <span class="bp-label">{group.label}</span>
          <span class="bp-count">{group.issues.length}</span>
        </button>
        {#if !collapsed.has(idx)}
          {#each group.issues as issue}
            <button class="bl-item" onclick={() => onselect?.(issue)}>
              <span class="bl-dot"
                class:dot-open={issue.status === 'open'}
                class:dot-progress={issue.status === 'in_progress'}
                class:dot-blocked={issue.status === 'blocked'}
              ></span>
              <span class="bl-title">{issue.title}</span>
            </button>
          {/each}
        {/if}
      {/each}
    </div>
  {/if}
</aside>

<style>
  .backlog {
    width: 220px;
    flex-shrink: 0;
    border-right: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .backlog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .backlog-title { font-size: 12px; font-weight: 600; color: var(--color-text); }
  .backlog-count {
    font-size: 10px;
    color: var(--color-text-faint);
    background: var(--color-surface-2);
    padding: 1px 6px;
    border-radius: 10px;
  }
  .backlog-empty { padding: 20px 12px; font-size: 12px; color: var(--color-text-faint); text-align: center; }
  .backlog-list { flex: 1; overflow-y: auto; }
  .bp-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    width: 100%;
    background: var(--color-surface);
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .bp-header:hover { background: var(--color-surface-2); }
  .bp-chevron { font-size: 9px; color: var(--color-text-faint); width: 10px; }
  .bp-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
  .bp-count { font-size: 10px; color: var(--color-text-faint); margin-left: auto; }
  .bl-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px 5px 24px;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border-subtle);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
  }
  .bl-item:hover { background: var(--color-surface); }
  .bl-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .dot-open { background: var(--color-open); }
  .dot-progress { background: var(--color-accent); }
  .dot-blocked { background: var(--color-blocked); }
  .bl-title {
    font-size: 12px;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
