<script lang="ts">
  import Button from './ui/Button.svelte'
  import GitHubConnect from './GitHubConnect.svelte'
  import { loadFromJSONL } from '../stores/issues'
  import { isConnected, reconnect } from '../stores/github'

  interface Props {
    onloaded?: () => void
  }
  let { onloaded }: Props = $props()

  let tab = $state<'file' | 'github'>('file')
  let fileMode = $state(false)

  // auto-reconnect if token exists
  $effect(() => { reconnect() })

  let pasteText = $state('')
  let dragOver = $state(false)
  let error = $state('')

  function handlePaste() {
    if (!pasteText.trim()) return
    try {
      loadFromJSONL(pasteText, 'paste:input', 'Pasted JSONL')
      onloaded?.()
    } catch (e) {
      error = 'Failed to parse JSONL'
    }
  }

  function handleFile(file: File) {
    error = ''
    const reader = new FileReader()
    reader.onload = () => {
      try {
        loadFromJSONL(reader.result as string, `file:${file.name}`, file.name)
        onloaded?.()
      } catch {
        error = 'Failed to parse file'
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    const file = e.dataTransfer?.files[0]
    if (file) handleFile(file)
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) handleFile(file)
  }

  function loadDemo() {
    const demo = generateDemoData()
    loadFromJSONL(demo, 'demo:project', 'Demo project')
    onloaded?.()
  }
</script>

<div class="landing">
  <div class="landing-inner">
    <div class="landing-header">
      <svg class="landing-logo" viewBox="0 0 24 18" fill="none">
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
      <h1 class="landing-title">beadsmap</h1>
      <p class="landing-sub">Visualize your <a class="beads-link" href="https://github.com/dariye/beads" target="_blank" rel="noopener">beads</a> issues as an interactive roadmap</p>
    </div>

    {#snippet fileContent()}
      <div
        class="drop-zone"
        class:drop-active={dragOver}
        ondragover={(e) => { e.preventDefault(); dragOver = true }}
        ondragleave={() => (dragOver = false)}
        ondrop={handleDrop}
        role="button"
        tabindex="0"
      >
        <div class="drop-inner">
          <div class="drop-icon">↑</div>
          <p class="drop-label">Drop <code>issues.jsonl</code> here</p>
          <p class="drop-or">or</p>
          <label class="browse-btn">
            Browse files
            <input type="file" accept=".jsonl,.json" class="sr-only" onchange={handleFileInput} />
          </label>
        </div>
      </div>

      <div class="paste-section">
        <span class="paste-label">Paste JSONL</span>
        <textarea
          bind:value={pasteText}
          placeholder="bd export | pbcopy, then paste here..."
          class="paste-textarea"
        ></textarea>
        <Button variant="outline" size="sm" onclick={handlePaste}>Load from paste</Button>
      </div>
    {/snippet}

    {#if $isConnected}
      {#if fileMode}
        <button class="back-link" onclick={() => fileMode = false}>← GitHub repos</button>
        {@render fileContent()}
      {:else}
        <GitHubConnect {onloaded} />
      {/if}
    {:else}
      <div class="source-tabs">
        <button class="source-tab" class:source-tab-active={tab === 'file'} onclick={() => tab = 'file'}>File / Paste</button>
        <button class="source-tab" class:source-tab-active={tab === 'github'} onclick={() => tab = 'github'}>GitHub</button>
      </div>
      <div class="tab-content">
        <div class="tab-panel" class:tab-panel-hidden={tab !== 'file'}>
          {@render fileContent()}
        </div>
        <div class="tab-panel" class:tab-panel-hidden={tab !== 'github'}>
          <GitHubConnect {onloaded} />
        </div>
      </div>
    {/if}

    <div class="demo-section">
      {#if $isConnected && !fileMode}
        <button class="demo-link" onclick={() => fileMode = true}>use File / Paste</button>
        <span class="demo-sep">·</span>
      {/if}
      <button class="demo-link" onclick={loadDemo}>
        or load demo data to explore →
      </button>
    </div>

    {#if error}
      <p class="error-msg">{error}</p>
    {/if}

    <p class="landing-footer">
      &copy; {new Date().getFullYear()} <a href="https://paul.dariye.com" target="_blank" rel="noopener">dariye</a>
      <span class="footer-sep">·</span>
      <a href="https://github.com/dariye/beadsmap" target="_blank" rel="noopener">source</a>
    </p>
  </div>
</div>

<style>
  .landing {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .landing-inner { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 28px; }
  .landing-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .landing-logo { width: 36px; height: 27px; margin-bottom: 4px; }
  .landing-title { font-size: 22px; font-weight: 700; color: var(--color-text); margin: 0; letter-spacing: -0.03em; }
  .landing-sub { font-size: 13px; color: var(--color-text-faint); margin: 0; }
  .beads-link { color: var(--color-accent); text-decoration: none; }
  .beads-link:hover { text-decoration: underline; }
  .tab-content {
    display: grid;
  }
  .tab-panel {
    grid-row: 1;
    grid-column: 1;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .tab-panel-hidden {
    visibility: hidden;
    pointer-events: none;
  }
  .back-link {
    background: none;
    border: none;
    font-size: 12px;
    color: var(--color-text-faint);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    padding: 0;
  }
  .back-link:hover { color: var(--color-text-muted); }
  .demo-sep { color: var(--color-text-faint); margin: 0 4px; }
  .source-tabs {
    display: flex;
    gap: 1px;
    background: var(--color-border-subtle);
    border-radius: 8px;
    overflow: hidden;
  }
  .source-tab {
    flex: 1;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    background: var(--color-surface);
    color: var(--color-text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all 100ms;
  }
  .source-tab:hover { color: var(--color-text); }
  .source-tab-active {
    background: var(--color-accent);
    color: var(--color-bar-text);
  }
  .drop-zone {
    border: 2px dashed var(--color-border);
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    transition: all 150ms;
  }
  .drop-zone:hover { border-color: var(--color-text-muted); }
  .drop-active { border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 5%, transparent); }
  .drop-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .drop-icon { font-size: 28px; color: var(--color-text-faint); }
  .drop-label { font-size: 13px; color: var(--color-text-muted); }
  .drop-label code { color: var(--color-accent); font-size: 12px; }
  .drop-or { font-size: 11px; color: var(--color-text-faint); }
  .browse-btn {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 13px;
    cursor: pointer;
    transition: all 150ms;
    border: 1px solid var(--color-border);
  }
  .browse-btn:hover { background: var(--color-surface-2); color: var(--color-text); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  .paste-section { display: flex; flex-direction: column; gap: 8px; }
  .paste-label { font-size: 11px; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.05em; }
  .paste-textarea {
    width: 100%;
    height: 100px;
    border-radius: 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 10px 12px;
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--color-text-muted);
    resize: none;
    box-sizing: border-box;
  }
  .paste-textarea:focus { outline: none; border-color: var(--color-accent); }
  .paste-textarea::placeholder { color: var(--color-text-faint); }
  .demo-section { text-align: center; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }
  .demo-link {
    background: none;
    border: none;
    font-size: 12px;
    color: var(--color-text-faint);
    cursor: pointer;
    font-family: inherit;
  }
  .demo-link:hover { color: var(--color-text-muted); }
  .error-msg { font-size: 13px; color: var(--color-risk); text-align: center; }
  .landing-footer { font-size: 11px; color: var(--color-text-faint); text-align: center; margin: 0; }
  .landing-footer a { color: var(--color-text-faint); text-decoration: none; }
  .landing-footer a:hover { color: var(--color-text-muted); }
  .footer-sep { margin: 0 4px; }
</style>

<script lang="ts" module>
function generateDemoData(): string {
  const now = new Date()
  const d = (offset: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + offset)
    return date.toISOString()
  }

  const issues = [
    { id: 'br-001', title: 'Auth flow redesign', status: 'closed', priority: 1, issue_type: 'feature', labels: ['milestone:v2.0'], due_at: d(-3), created_at: d(-21), updated_at: d(-3), closed_at: d(-3), estimated_minutes: 960, dependencies: [] },
    { id: 'br-002', title: 'API caching layer', status: 'closed', priority: 2, issue_type: 'task', labels: ['milestone:v2.0'], due_at: d(-1), created_at: d(-18), updated_at: d(-1), closed_at: d(-1), estimated_minutes: 720, dependencies: [] },
    { id: 'br-003', title: 'WCAG contrast audit', status: 'in_progress', priority: 1, issue_type: 'task', labels: ['milestone:v2.0'], due_at: d(10), created_at: d(-14), updated_at: d(-1), estimated_minutes: 480, dependencies: [{ target: 'br-001', type: 'blocks' }] },
    { id: 'br-004', title: 'Search index rebuild', status: 'blocked', priority: 2, issue_type: 'task', labels: ['milestone:v2.0'], due_at: d(18), created_at: d(-10), updated_at: d(-2), estimated_minutes: 960, dependencies: [{ target: 'br-002', type: 'blocks' }] },
    { id: 'br-005', title: 'Release v2.0', status: 'open', priority: 0, issue_type: 'task', labels: ['milestone:v2.0'], due_at: d(25), created_at: d(-10), updated_at: d(-2), estimated_minutes: 240, dependencies: [{ target: 'br-003', type: 'blocks' }, { target: 'br-004', type: 'blocks' }] },
    { id: 'br-006', title: 'v2.0 Milestone', status: 'open', priority: 1, issue_type: 'epic', labels: ['milestone:v2.0'], due_at: d(25), created_at: d(-30), updated_at: d(-1), dependencies: [] },
    { id: 'br-010', title: 'Dark mode theming', status: 'open', priority: 2, issue_type: 'feature', labels: ['milestone:v2.1'], due_at: d(40), created_at: d(-7), updated_at: d(-2), estimated_minutes: 720, dependencies: [] },
    { id: 'br-011', title: 'Mobile navigation', status: 'open', priority: 2, issue_type: 'feature', labels: ['milestone:v2.1'], due_at: d(50), created_at: d(-7), updated_at: d(-2), estimated_minutes: 960, dependencies: [{ target: 'br-010', type: 'blocks' }] },
    { id: 'br-012', title: 'v2.1 Milestone', status: 'open', priority: 1, issue_type: 'epic', labels: ['milestone:v2.1'], due_at: d(55), created_at: d(-7), updated_at: d(-2), dependencies: [] },
    { id: 'br-020', title: 'Tech debt cleanup', status: 'open', priority: 3, issue_type: 'chore', labels: [], created_at: d(-20), updated_at: d(-5), estimated_minutes: 480, dependencies: [] },
    { id: 'br-021', title: 'Logging overhaul', status: 'open', priority: 2, issue_type: 'task', labels: [], created_at: d(-15), updated_at: d(-3), estimated_minutes: 360, dependencies: [] },
    { id: 'br-022', title: 'Perf benchmarks', status: 'open', priority: 4, issue_type: 'task', labels: [], created_at: d(-12), updated_at: d(-4), estimated_minutes: 240, dependencies: [] },
  ]

  return issues.map((i) => JSON.stringify(i)).join('\n')
}
</script>
