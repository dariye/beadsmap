<script lang="ts">
  import type { Issue } from '../lib/types'
  import Badge from './ui/Badge.svelte'
  import Button from './ui/Button.svelte'
  import { updateIssue } from '../stores/issues'

  interface Props {
    issue: Issue
    onclose?: () => void
  }
  let { issue, onclose }: Props = $props()

  let editingDue = $state(false)
  let dueValue = $derived(issue.due_at ? issue.due_at.slice(0, 10) : '')

  const statusVariant: Record<string, 'done' | 'progress' | 'blocked' | 'open'> = {
    closed: 'done',
    in_progress: 'progress',
    hooked: 'progress',
    blocked: 'blocked',
    open: 'open',
    deferred: 'open',
  }

  const priorityLabel: Record<number, string> = {
    0: 'P0 Critical',
    1: 'P1 High',
    2: 'P2 Normal',
    3: 'P3 Low',
    4: 'P4 Lowest',
  }

  function saveDue() {
    if (dueValue) {
      updateIssue(issue.id, { due_at: new Date(dueValue).toISOString() })
    } else {
      updateIssue(issue.id, { due_at: undefined })
    }
    editingDue = false
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose}></div>

<div class="detail">
  <div class="detail-header">
    <div class="detail-meta">
      <div class="detail-id-row">
        <span class="detail-id">{issue.id}</span>
        <Badge variant={statusVariant[issue.status] ?? 'open'}>{issue.status.replace('_', ' ')}</Badge>
      </div>
      <h3 class="detail-title">{issue.title}</h3>
    </div>
    <button class="detail-close" onclick={onclose}>×</button>
  </div>

  <div class="detail-grid">
    <div class="detail-field">
      <div class="detail-label">Priority</div>
      <div class="detail-value">{priorityLabel[issue.priority] ?? `P${issue.priority}`}</div>
    </div>
    <div class="detail-field">
      <div class="detail-label">Type</div>
      <div class="detail-value">{issue.issue_type}</div>
    </div>
    {#if issue.assignee}
      <div class="detail-field">
        <div class="detail-label">Assignee</div>
        <div class="detail-value">{issue.assignee}</div>
      </div>
    {/if}
    {#if issue.estimated_minutes}
      <div class="detail-field">
        <div class="detail-label">Estimate</div>
        <div class="detail-value">{Math.round(issue.estimated_minutes / 60)}h</div>
      </div>
    {/if}
  </div>

  <div class="detail-field">
    <div class="detail-label">Due date</div>
    {#if editingDue}
      <div class="due-edit">
        <input type="date" value={dueValue} class="due-input" onchange={(e) => {
          const val = (e.target as HTMLInputElement).value
          if (val) updateIssue(issue.id, { due_at: new Date(val).toISOString() })
          editingDue = false
        }} />
        <Button size="sm" variant="ghost" onclick={() => (editingDue = false)}>Cancel</Button>
      </div>
    {:else}
      <button class="due-btn" onclick={() => (editingDue = true)}>
        {issue.due_at
          ? new Date(issue.due_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
          : '+ Set due date'}
      </button>
    {/if}
  </div>

  {#if issue.dependencies.length > 0}
    <div class="detail-field">
      <div class="detail-label">Dependencies</div>
      <div class="dep-list">
        {#each issue.dependencies as dep}
          <Badge variant="outline">{dep.type}: {dep.target}</Badge>
        {/each}
      </div>
    </div>
  {/if}

  {#if issue.labels.length > 0}
    <div class="label-list">
      {#each issue.labels as label}
        <Badge>{label}</Badge>
      {/each}
    </div>
  {/if}

  {#if issue.description}
    <div class="detail-desc">{issue.description}</div>
  {/if}
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 40; }
  .detail {
    position: fixed;
    z-index: 50;
    width: 320px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    box-shadow: 0 16px 48px var(--color-shadow);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .detail-header { display: flex; justify-content: space-between; gap: 8px; }
  .detail-meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .detail-id-row { display: flex; align-items: center; gap: 6px; }
  .detail-id { font-size: 12px; color: var(--color-text-faint); font-family: monospace; }
  .detail-title { font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0; line-height: 1.35; }
  .detail-close {
    background: none; border: none; font-size: 18px; color: var(--color-text-faint);
    cursor: pointer; line-height: 1; padding: 0; height: fit-content;
  }
  .detail-close:hover { color: var(--color-text); }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .detail-field { display: flex; flex-direction: column; gap: 2px; }
  .detail-label { font-size: 11px; color: var(--color-text-faint); }
  .detail-value { font-size: 13px; color: var(--color-text-muted); }
  .due-edit { display: flex; align-items: center; gap: 6px; }
  .due-input {
    flex: 1;
    border-radius: 6px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 4px 8px;
    font-size: 13px;
    color: var(--color-text);
    font-family: inherit;
  }
  .due-input:focus { outline: none; border-color: var(--color-accent); }
  .due-btn {
    background: none; border: none; font-size: 13px; color: var(--color-accent);
    cursor: pointer; padding: 0; font-family: inherit; text-align: left;
  }
  .due-btn:hover { text-decoration: underline; }
  .dep-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .label-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .detail-desc {
    font-size: 12px;
    color: var(--color-text-muted);
    border-top: 1px solid var(--color-border-subtle);
    padding-top: 8px;
    max-height: 120px;
    overflow-y: auto;
    line-height: 1.5;
  }
</style>
