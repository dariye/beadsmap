<script lang="ts">
  import type { Issue } from '../lib/types'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import Progress from './ui/Progress.svelte'
  import { updateIssue, issueSourceMap, sources } from '../stores/issues'

  interface Props {
    issues: Issue[]
    onselect?: (issue: Issue) => void
  }
  let { issues, onselect }: Props = $props()

  type GroupBy = 'priority' | 'status' | 'type' | 'assignee' | 'label' | 'source'
  let groupBy = $state<GroupBy>('priority')
  let collapsed = $state<Set<string>>(new Set())

  function toggle(key: string) {
    collapsed = new Set(collapsed)
    if (collapsed.has(key)) collapsed.delete(key)
    else collapsed.add(key)
  }

  interface Group {
    key: string
    label: string
    issues: Issue[]
    progress: number
    counts: { done: number; open: number; blocked: number }
  }

  const groups = $derived.by((): Group[] => {
    const map = new Map<string, Issue[]>()
    const order: string[] = []

    for (const issue of issues) {
      const keys = getGroupKeys(issue, groupBy)
      for (const key of keys) {
        if (!map.has(key)) { map.set(key, []); order.push(key) }
        map.get(key)!.push(issue)
      }
    }

    return order.map((key) => {
      const g = map.get(key)!
      const done = g.filter((i) => i.status === 'closed').length
      const blocked = g.filter((i) => i.status === 'blocked').length
      return {
        key,
        label: formatGroupLabel(key, groupBy),
        issues: g,
        progress: g.length > 0 ? done / g.length : 0,
        counts: { done, open: g.length - done - blocked, blocked },
      }
    })
  })

  function getGroupKeys(issue: Issue, by: GroupBy): string[] {
    switch (by) {
      case 'priority': return [`p${issue.priority}`]
      case 'status': return [issue.status]
      case 'type': return [issue.issue_type]
      case 'assignee': return [issue.assignee || 'Unassigned']
      case 'label':
        return issue.labels.length > 0 ? issue.labels : ['No labels']
      case 'source':
        return [$issueSourceMap.get(issue.id)?.label ?? 'Unknown']
    }
  }

  function formatGroupLabel(key: string, by: GroupBy): string {
    if (by === 'priority') {
      const labels: Record<string, string> = {
        p0: 'P0 Critical', p1: 'P1 High', p2: 'P2 Normal', p3: 'P3 Low', p4: 'P4 Lowest',
      }
      return labels[key] ?? key
    }
    if (by === 'status') {
      return key.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
    }
    return key
  }

  const statusVariant: Record<string, 'done' | 'progress' | 'blocked' | 'open'> = {
    closed: 'done', in_progress: 'progress', hooked: 'progress',
    blocked: 'blocked', open: 'open', deferred: 'open',
  }

  const multiSource = $derived($sources.length > 1)
</script>

<div class="list-view">
  <div class="list-toolbar">
    <span class="toolbar-label">Group by</span>
    {#each ['priority', 'status', 'type', 'assignee', 'label', 'source'] as opt}
      <button
        class="group-btn"
        class:group-btn-active={groupBy === opt}
        onclick={() => groupBy = opt as GroupBy}
      >{opt}</button>
    {/each}
  </div>

  <div class="list-groups">
    {#each groups as group}
      <div class="group">
        <button class="group-header" onclick={() => toggle(group.key)}>
          <span class="group-chevron">{collapsed.has(group.key) ? '▸' : '▾'}</span>
          <span class="group-name">{group.label}</span>
          <span class="group-count">{group.issues.length}</span>
          <div class="group-progress"><Progress value={group.progress} /></div>
          <span class="group-stats">
            {group.counts.done} done · {group.counts.open} open
            {#if group.counts.blocked > 0}
              · <span class="stat-blocked">{group.counts.blocked} blocked</span>
            {/if}
          </span>
        </button>

        {#if !collapsed.has(group.key)}
          <div class="group-items">
            {#each group.issues as issue}
              <button class="list-item" onclick={() => onselect?.(issue)}>
                <span class="item-status">
                  <span class="status-dot" class:dot-done={issue.status === 'closed'}
                    class:dot-progress={issue.status === 'in_progress' || issue.status === 'hooked'}
                    class:dot-blocked={issue.status === 'blocked'}
                    class:dot-open={issue.status === 'open' || issue.status === 'deferred'}
                  ></span>
                </span>
                {#if multiSource}
                  <span class="source-dot" style="background: {$issueSourceMap.get(issue.id)?.color ?? 'transparent'}"></span>
                {/if}
                <span class="item-id">{issue.id}</span>
                <span class="item-title">{issue.title}</span>
                <span class="item-meta">
                  {#if issue.issue_type !== 'task'}
                    <Badge variant="outline">{issue.issue_type}</Badge>
                  {/if}
                  <Badge variant={statusVariant[issue.status] ?? 'open'}>
                    {issue.status.replace('_', ' ')}
                  </Badge>
                </span>
                <span class="item-due">
                  {#if issue.due_at}
                    {new Date(issue.due_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  {:else}
                    <span class="no-date">—</span>
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .list-view { flex: 1; overflow-y: auto; }
  .list-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--color-border-subtle);
    position: sticky;
    top: 0;
    background: var(--color-bg);
    z-index: 5;
  }
  .toolbar-label { font-size: 12px; color: var(--color-text-faint); margin-right: 4px; }
  .group-btn {
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    text-transform: capitalize;
  }
  .group-btn:hover { background: var(--color-surface); }
  .group-btn-active {
    background: var(--color-accent);
    color: var(--color-bar-text);
    border-color: var(--color-accent);
  }
  .list-groups { padding: 0; }
  .group { border-bottom: 1px solid var(--color-border-subtle); }
  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    width: 100%;
    background: var(--color-surface);
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
  }
  .group-header:hover { background: var(--color-surface-2); }
  .group-chevron { color: var(--color-text-faint); font-size: 11px; width: 12px; }
  .group-name { font-size: 13px; font-weight: 600; color: var(--color-text); }
  .group-count {
    font-size: 11px;
    color: var(--color-text-faint);
    background: var(--color-surface-2);
    padding: 1px 6px;
    border-radius: 10px;
  }
  .group-progress { width: 100px; }
  .group-stats { font-size: 11px; color: var(--color-text-faint); margin-left: auto; }
  .stat-blocked { color: var(--color-blocked); }
  .group-items { }
  .list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px 8px 40px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .list-item:hover { background: var(--color-surface); }
  .list-item:last-child { border-bottom: none; }
  .item-status { width: 12px; flex-shrink: 0; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: block; }
  .dot-done { background: var(--color-done); }
  .dot-progress { background: var(--color-accent); }
  .dot-blocked { background: var(--color-blocked); }
  .dot-open { background: var(--color-open); }
  .item-id { font-size: 11px; color: var(--color-text-faint); font-family: monospace; width: 64px; flex-shrink: 0; }
  .item-title { font-size: 13px; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-meta { display: flex; gap: 4px; flex-shrink: 0; }
  .item-due { font-size: 12px; color: var(--color-text-faint); width: 60px; text-align: right; flex-shrink: 0; }
  .no-date { color: var(--color-border); }
  .source-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
</style>
