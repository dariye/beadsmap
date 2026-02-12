<script lang="ts">
  import type { Issue } from '../lib/types'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import { updateIssue, updateIssues, issueSourceMap, sources } from '../stores/issues'

  interface Props {
    issues: Issue[]
    onselect?: (issue: Issue) => void
  }
  let { issues, onselect }: Props = $props()

  type SortKey = 'id' | 'title' | 'status' | 'priority' | 'due_at' | 'issue_type'
  let sortKey = $state<SortKey>('priority')
  let sortAsc = $state(true)
  let selected = $state<Set<string>>(new Set())
  let bulkDue = $state('')
  let bulkMilestone = $state('')
  let showBulk = $state(false)

  const sorted = $derived.by(() => {
    const copy = [...issues]
    copy.sort((a, b) => {
      let va: string | number = '', vb: string | number = ''
      switch (sortKey) {
        case 'id': va = a.id; vb = b.id; break
        case 'title': va = a.title.toLowerCase(); vb = b.title.toLowerCase(); break
        case 'status': va = a.status; vb = b.status; break
        case 'priority': va = a.priority; vb = b.priority; break
        case 'due_at': va = a.due_at ?? '9999'; vb = b.due_at ?? '9999'; break
        case 'issue_type': va = a.issue_type; vb = b.issue_type; break
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
    return copy
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) sortAsc = !sortAsc
    else { sortKey = key; sortAsc = true }
  }

  function toggleSelect(id: string) {
    selected = new Set(selected)
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    showBulk = selected.size > 0
  }

  function toggleAll() {
    if (selected.size === issues.length) {
      selected = new Set()
      showBulk = false
    } else {
      selected = new Set(issues.map((i) => i.id))
      showBulk = true
    }
  }

  function applyBulkDue() {
    if (!bulkDue) return
    updateIssues([...selected], { due_at: new Date(bulkDue).toISOString() })
    bulkDue = ''
  }

  function applyBulkMilestone() {
    if (!bulkMilestone) return
    const label = `milestone:${bulkMilestone}`
    const ids = [...selected]
    for (const id of ids) {
      const issue = issues.find((i) => i.id === id)
      if (!issue) continue
      const labels = issue.labels.filter((l) => !l.startsWith('milestone:'))
      labels.push(label)
      updateIssue(id, { labels })
    }
    bulkMilestone = ''
  }

  const statusVariant: Record<string, 'done' | 'progress' | 'blocked' | 'open'> = {
    closed: 'done', in_progress: 'progress', hooked: 'progress',
    blocked: 'blocked', open: 'open', deferred: 'open',
  }

  const priorityLabel: Record<number, string> = {
    0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4',
  }

  const multiSource = $derived($sources.length > 1)
</script>

<div class="table-view">
  {#if showBulk}
    <div class="bulk-bar">
      <span class="bulk-count">{selected.size} selected</span>
      <div class="bulk-actions">
        <input type="date" bind:value={bulkDue} class="bulk-input" />
        <Button size="sm" variant="outline" onclick={applyBulkDue}>Set due date</Button>
        <input type="text" bind:value={bulkMilestone} placeholder="milestone name" class="bulk-input bulk-text" />
        <Button size="sm" variant="outline" onclick={applyBulkMilestone}>Set milestone</Button>
      </div>
      <button class="bulk-clear" onclick={() => { selected = new Set(); showBulk = false }}>Clear</button>
    </div>
  {/if}

  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th class="th-check">
            <input type="checkbox" checked={selected.size === issues.length && issues.length > 0} onchange={toggleAll} />
          </th>
          {#each [['id','ID'],['title','Title'],['status','Status'],['priority','P'],['issue_type','Type'],['due_at','Due']] as [key, label]}
            <th class="th-{key}" onclick={() => toggleSort(key as SortKey)}>
              <span class="th-content">
                {label}
                {#if sortKey === key}
                  <span class="sort-arrow">{sortAsc ? '↑' : '↓'}</span>
                {/if}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each sorted as issue}
          <tr class:row-selected={selected.has(issue.id)}>
            <td class="td-check">
              <input type="checkbox" checked={selected.has(issue.id)} onchange={() => toggleSelect(issue.id)} />
            </td>
            <td class="td-id">
              {#if multiSource}
                <span class="source-dot" style="background: {$issueSourceMap.get(issue.id)?.color ?? 'transparent'}"></span>
              {/if}
              {issue.id}
            </td>
            <td class="td-title">
              <button class="title-btn" onclick={() => onselect?.(issue)}>{issue.title}</button>
            </td>
            <td class="td-status">
              <Badge variant={statusVariant[issue.status] ?? 'open'}>
                {issue.status.replace('_', ' ')}
              </Badge>
            </td>
            <td class="td-priority">
              <span class="priority-pill" class:p-critical={issue.priority === 0} class:p-high={issue.priority === 1}>
                {priorityLabel[issue.priority] ?? `P${issue.priority}`}
              </span>
            </td>
            <td class="td-type">{issue.issue_type}</td>
            <td class="td-due">
              {#if issue.due_at}
                <span class:overdue={new Date(issue.due_at) < new Date() && issue.status !== 'closed'}>
                  {new Date(issue.due_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
              {:else}
                <button class="set-due-btn" onclick={() => {
                  const date = prompt('Due date (YYYY-MM-DD):')
                  if (date) updateIssue(issue.id, { due_at: new Date(date).toISOString() })
                }}>+</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .table-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .bulk-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg));
    border-bottom: 1px solid var(--color-accent);
  }
  .bulk-count { font-size: 12px; font-weight: 600; color: var(--color-accent); }
  .bulk-actions { display: flex; align-items: center; gap: 6px; }
  .bulk-input {
    height: 28px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 12px;
    font-family: inherit;
  }
  .bulk-input:focus { outline: none; border-color: var(--color-accent); }
  .bulk-text { width: 120px; }
  .bulk-clear {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--color-text-faint);
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }
  .bulk-clear:hover { color: var(--color-text); }
  .table-scroll { flex: 1; overflow: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead { position: sticky; top: 0; z-index: 2; }
  th {
    padding: 8px 12px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    user-select: none;
  }
  th:hover { color: var(--color-text); }
  .th-content { display: flex; align-items: center; gap: 4px; }
  .sort-arrow { font-size: 10px; color: var(--color-accent); }
  .th-check { width: 32px; cursor: default; }
  td { padding: 6px 12px; border-bottom: 1px solid var(--color-border-subtle); }
  tr:hover td { background: var(--color-surface); }
  .row-selected td { background: color-mix(in srgb, var(--color-accent) 6%, transparent); }
  .td-check { width: 32px; }
  .td-id { font-family: monospace; font-size: 11px; color: var(--color-text-faint); width: 70px; display: flex; align-items: center; gap: 6px; }
  .source-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .td-title { max-width: 0; }
  .title-btn {
    background: none;
    border: none;
    color: var(--color-text);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
  }
  .title-btn:hover { color: var(--color-accent); }
  .td-status { width: 90px; }
  .td-priority { width: 40px; }
  .priority-pill { font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
  .p-critical { color: var(--color-risk); }
  .p-high { color: var(--color-blocked); }
  .td-type { width: 70px; color: var(--color-text-faint); font-size: 12px; }
  .td-due { width: 70px; font-size: 12px; color: var(--color-text-muted); }
  .overdue { color: var(--color-risk); }
  .set-due-btn {
    background: none;
    border: 1px dashed var(--color-border);
    border-radius: 4px;
    color: var(--color-text-faint);
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .set-due-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
  input[type="checkbox"] { accent-color: var(--color-accent); }
</style>
