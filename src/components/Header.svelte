<script lang="ts">
  import Button from './ui/Button.svelte'
  import { exportJSONL, sources, clearData, removeSource } from '../stores/issues'
  import { zoomIn, zoomOut, setRange } from '../stores/viewport'
  import { theme, cycleTheme } from '../stores/theme'
  import { viewMode, type ViewMode } from '../stores/view'
  import { hasRepo, ghLoading, syncAllRepos } from '../stores/github'

  interface Props {
    onadd?: () => void
  }
  let { onadd }: Props = $props()

  const themeIcon = $derived($theme === 'light' ? '☀' : $theme === 'dark' ? '☾' : '◐')
  let syncStatus = $state<'idle' | 'syncing' | 'done' | 'error'>('idle')
  let copiedKey = $state<string | null>(null)

  function copySourceKey(key: string) {
    const path = key.startsWith('file:') ? key.slice(5) : key
    navigator.clipboard.writeText(path)
    copiedKey = key
    setTimeout(() => { copiedKey = null }, 1500)
  }

  async function handleSync() {
    syncStatus = 'syncing'
    const ok = await syncAllRepos()
    syncStatus = ok ? 'done' : 'error'
    if (ok) setTimeout(() => { syncStatus = 'idle' }, 2000)
  }

  function handleExport() {
    const jsonl = exportJSONL()
    const blob = new Blob([jsonl], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'issues.jsonl'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleClear() {
    if (!confirm('Clear all projects? This cannot be undone.')) return
    clearData()
  }

  const views: { key: ViewMode; label: string }[] = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'list', label: 'List' },
    { key: 'table', label: 'Table' },
  ]
</script>

<header class="header">
  <div class="header-left">
    <h1 class="logo">
      <svg class="logo-svg" viewBox="0 0 24 18" fill="none">
        <path d="M3 3L9 3L9 9L15 9L15 15L21 15" stroke="var(--color-accent)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
        <circle cx="3" cy="3" r="2" fill="var(--color-accent)"/>
        <circle cx="9" cy="3" r="2" fill="var(--color-accent)"/>
        <circle cx="9" cy="9" r="2" fill="var(--color-accent)"/>
        <circle cx="15" cy="9" r="2" fill="var(--color-accent)"/>
        <circle cx="15" cy="15" r="2" fill="var(--color-accent)"/>
        <circle cx="21" cy="15" r="2" fill="var(--color-accent)"/>
        <circle cx="15" cy="3" r="1.2" fill="currentColor" opacity="0.15"/>
        <circle cx="21" cy="3" r="1.2" fill="currentColor" opacity="0.15"/>
        <circle cx="3" cy="9" r="1.2" fill="currentColor" opacity="0.15"/>
        <circle cx="21" cy="9" r="1.2" fill="currentColor" opacity="0.15"/>
        <circle cx="3" cy="15" r="1.2" fill="currentColor" opacity="0.15"/>
        <circle cx="9" cy="15" r="1.2" fill="currentColor" opacity="0.15"/>
      </svg>
      beadsmap
    </h1>

    <div class="view-tabs">
      {#each views as v}
        <button
          class="view-tab"
          class:view-tab-active={$viewMode === v.key}
          onclick={() => viewMode.set(v.key)}
        >{v.label}</button>
      {/each}
    </div>
  </div>

  <div class="header-right">
    <Button variant="ghost" size="sm" onclick={cycleTheme}>{themeIcon}</Button>
    <span class="divider"></span>

    {#if $viewMode === 'timeline'}
      <Button variant="ghost" size="sm" onclick={() => setRange(2)}>2w</Button>
      <Button variant="ghost" size="sm" onclick={() => setRange(4)}>4w</Button>
      <Button variant="ghost" size="sm" onclick={() => setRange(6)}>6w</Button>
      <Button variant="ghost" size="sm" onclick={() => setRange(8)}>8w</Button>
      <Button variant="ghost" size="sm" onclick={() => setRange(13)}>Q</Button>
      <span class="divider"></span>
      <Button variant="ghost" size="sm" onclick={zoomOut}>−</Button>
      <Button variant="ghost" size="sm" onclick={zoomIn}>+</Button>
      <span class="divider"></span>
    {/if}

    {#if $hasRepo}
      <Button variant="ghost" size="sm" onclick={handleSync} disabled={syncStatus === 'syncing'}>
        {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'done' ? 'Synced' : syncStatus === 'error' ? 'Failed' : 'Sync'}
      </Button>
    {/if}
    <Button variant="ghost" size="sm" onclick={handleExport}>Export</Button>
    <span class="divider"></span>

    <div class="source-list">
      {#each $sources as src}
        <span class="source-chip-wrap">
          {#if src.repo}
            <a class="source-chip source-chip-link" href="https://github.com/{src.repo}" target="_blank" rel="noopener">{src.label}</a>
          {:else}
            <button
              class="source-chip source-chip-copy"
              title={copiedKey === src.key ? 'Copied!' : src.key.startsWith('file:') ? 'Copy filename' : src.label}
              onclick={() => copySourceKey(src.key)}
            >{copiedKey === src.key ? 'Copied!' : src.label}</button>
          {/if}
          <button class="source-remove" title="Remove project" onclick={() => removeSource(src.key)}>×</button>
        </span>
      {/each}
    </div>
    <Button variant="ghost" size="sm" onclick={onadd}>+ Source</Button>
    {#if $sources.length > 0}
      <button class="clear-btn" onclick={handleClear} title="Clear all projects">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 4h12M5.5 4V2.5h5V4M6 7v5M10 7v5M3.5 4l.7 9.5a1 1 0 001 .9h5.6a1 1 0 001-.9L12.5 4"/>
        </svg>
      </button>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-subtle) 60%, transparent);
    background: var(--color-overlay);
    backdrop-filter: blur(16px) saturate(1.8);
    -webkit-backdrop-filter: blur(16px) saturate(1.8);
    position: sticky;
    top: 0;
    z-index: 30;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-right { display: flex; align-items: center; gap: 1px; }
  .logo { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0; letter-spacing: -0.02em; }
  .logo-svg { width: 18px; height: 14px; flex-shrink: 0; }
  .source-list {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 280px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .source-list::-webkit-scrollbar { display: none; }
  .source-chip {
    font-size: 11px;
    color: var(--color-text-muted);
    background: var(--color-surface);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 70%, transparent);
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    text-decoration: none;
    transition: all 120ms ease;
  }
  .source-chip-link:hover { color: var(--color-accent); border-color: color-mix(in srgb, var(--color-accent) 40%, transparent); background: color-mix(in srgb, var(--color-accent) 5%, transparent); }
  .source-chip-wrap {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 70%, transparent);
    background: var(--color-surface);
    transition: all 120ms ease;
  }
  .source-chip-wrap:hover { border-color: var(--color-border); }
  .source-chip-wrap .source-chip { border: none; border-radius: 0; background: none; }
  .source-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: none;
    color: var(--color-text-faint);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    border-left: 1px solid color-mix(in srgb, var(--color-border-subtle) 70%, transparent);
    transition: color 120ms ease;
  }
  .source-remove:hover { color: var(--color-risk); }
  .source-chip-copy { cursor: pointer; font-family: inherit; }
  .source-chip-copy:hover { color: var(--color-text); }
  .view-tabs {
    display: flex;
    gap: 1px;
    background: var(--color-border-subtle);
    border-radius: 6px;
    overflow: hidden;
    margin-left: 4px;
  }
  .view-tab {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    background: var(--color-surface);
    color: var(--color-text-faint);
    cursor: pointer;
    font-family: inherit;
    transition: color 120ms ease, background 120ms ease;
    letter-spacing: -0.01em;
  }
  .view-tab:hover { color: var(--color-text); }
  .view-tab-active {
    background: var(--color-text);
    color: var(--color-bg);
  }
  .divider {
    width: 1px;
    height: 14px;
    background: color-mix(in srgb, var(--color-border) 50%, transparent);
    margin: 0 5px;
  }
  .clear-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--color-text-faint);
    cursor: pointer;
    transition: color 120ms ease, background 120ms ease;
    flex-shrink: 0;
  }
  .clear-btn:hover { color: var(--color-risk); background: color-mix(in srgb, var(--color-risk) 8%, transparent); }
</style>
