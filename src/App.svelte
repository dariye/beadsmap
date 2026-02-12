<script lang="ts">
  import type { Issue } from './lib/types'
  import { rawIssues, hasData } from './stores/issues'
  import { milestones } from './stores/milestones'
  import { viewMode, suggestedView } from './stores/view'
  import DataInput from './components/DataInput.svelte'
  import Header from './components/Header.svelte'
  import Timeline from './components/timeline/Timeline.svelte'
  import ListView from './components/ListView.svelte'
  import TableView from './components/TableView.svelte'
  import Backlog from './components/Backlog.svelte'
  import IssueDetail from './components/IssueDetail.svelte'
  import Legend from './components/Legend.svelte'

  let selectedIssue = $state<Issue | null>(null)
  let showOverlay = $state(!$hasData)

  // auto-set view on first data load
  let viewInitialized = $state(false)
  $effect(() => {
    if ($hasData && !viewInitialized) {
      viewMode.set($suggestedView)
      viewInitialized = true
    }
  })

  // auto-show overlay when no data
  $effect(() => {
    if (!$hasData) showOverlay = true
  })

  function handleLoaded() {
    showOverlay = false
    if (!viewInitialized) {
      viewMode.set($suggestedView)
      viewInitialized = true
    }
  }

  function handleAddSource() {
    showOverlay = true
  }

  function handleSelect(issue: Issue) {
    selectedIssue = issue
  }
</script>

{#if $hasData}
  <div class="app-shell">
    <Header onadd={handleAddSource} />

    <div class="app-body">
      {#if $viewMode === 'timeline'}
        <Backlog issues={$rawIssues} onselect={handleSelect} />
        <div class="app-main">
          <Timeline milestones={$milestones} onselect={handleSelect} />
        </div>
      {:else if $viewMode === 'list'}
        <ListView issues={$rawIssues} onselect={handleSelect} />
      {:else if $viewMode === 'table'}
        <TableView issues={$rawIssues} onselect={handleSelect} />
      {/if}
    </div>

    <Legend issues={$rawIssues} />

    {#if selectedIssue}
      <IssueDetail issue={selectedIssue} onclose={() => (selectedIssue = null)} />
    {/if}
  </div>
{/if}

{#if showOverlay}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="overlay"
    class:overlay-full={!$hasData}
    onclick={(e) => { if (e.target === e.currentTarget && $hasData) showOverlay = false }}
  >
    <div class="overlay-content" class:overlay-center={!$hasData}>
      {#if $hasData}
        <button class="overlay-close" onclick={() => showOverlay = false}>×</button>
      {/if}
      <DataInput onloaded={handleLoaded} />
    </div>
  </div>
{/if}

<style>
  .app-shell {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .app-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .app-main {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--color-shadow);
    backdrop-filter: blur(4px);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
  }
  .overlay-full {
    background: var(--color-bg);
    backdrop-filter: none;
  }
  .overlay-content {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    background: var(--color-bg);
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 24px 48px var(--color-shadow);
  }
  .overlay-full .overlay-content {
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    max-height: none;
    min-height: 100%;
  }
  .overlay-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .overlay-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .overlay-close:hover { background: var(--color-surface-2); color: var(--color-text); }
</style>
