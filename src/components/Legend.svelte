<script lang="ts">
  import type { Issue } from '../lib/types'
  import { sources, SOURCE_COLORS } from '../stores/issues'

  interface Props {
    issues: Issue[]
  }
  let { issues }: Props = $props()

  const total = $derived(issues.length)
  const atRisk = $derived(
    issues.filter((i) => {
      if (i.status === 'closed') return false
      if (!i.due_at) return false
      return new Date(i.due_at) < new Date()
    }).length
  )
  const showSources = $derived($sources.length > 1)
</script>

<footer class="legend">
  <div class="legend-items">
    <span class="legend-item"><span class="dot dot-done"></span> done</span>
    <span class="legend-item"><span class="dot dot-progress"></span> in progress</span>
    <span class="legend-item"><span class="dot dot-open"></span> open</span>
    <span class="legend-item"><span class="dot dot-blocked"></span> blocked</span>
    {#if showSources}
      <span class="legend-sep"></span>
      {#each $sources as src, idx}
        <span class="legend-item">
          <span class="dot" style="background: {SOURCE_COLORS[idx % SOURCE_COLORS.length]}"></span>
          {src.label}
        </span>
      {/each}
    {/if}
  </div>
  <div class="legend-right">
    <span>{total} issues</span>
    {#if atRisk > 0}
      <span class="legend-risk">{atRisk} overdue</span>
    {/if}
    <span class="legend-sep"></span>
    <span class="legend-copy">&copy; {new Date().getFullYear()} <a href="https://paul.dariye.com" target="_blank" rel="noopener">dariye</a></span>
    <a class="legend-repo" href="https://github.com/dariye/beadsmap" target="_blank" rel="noopener">source</a>
  </div>
</footer>

<style>
  .legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 16px;
    border-top: 1px solid var(--color-border-subtle);
    font-size: 11px;
    color: var(--color-text-faint);
  }
  .legend-items { display: flex; gap: 14px; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-right { display: flex; align-items: center; gap: 12px; }
  .legend-risk { color: var(--color-risk); }
  .dot { width: 8px; height: 8px; border-radius: 2px; }
  .dot-done { background: var(--color-done); }
  .dot-progress { background: var(--color-accent); }
  .dot-open { background: var(--color-open); }
  .dot-blocked { background: var(--color-blocked); }
  .legend-sep { width: 1px; height: 12px; background: var(--color-border); margin: 0 4px; }
  .legend-copy { white-space: nowrap; }
  .legend-copy a, .legend-repo { color: var(--color-text-faint); text-decoration: none; }
  .legend-copy a:hover, .legend-repo:hover { color: var(--color-text-muted); }
</style>
