<script lang="ts">
  import Button from './ui/Button.svelte'
  import type { GitHubRepo } from '../lib/github'
  import {
    ghUser, ghError, ghLoading, isConnected, ghRepos,
    ghClientId, ghDeviceCode, ghPolling, hasClientId,
    ghProxyUrl,
    setClientId, setProxyUrl, startDeviceFlow, cancelDeviceFlow,
    fetchRepos, searchGhRepos, loadFromRepo, initBeads, disconnect,
  } from '../stores/github'

  interface Props {
    onloaded?: () => void
  }
  let { onloaded }: Props = $props()

  let clientIdInput = $state($ghClientId ?? '')
  let proxyInput = $state($ghProxyUrl ?? '')
  let repos = $state<GitHubRepo[]>([])
  let searchQuery = $state('')
  let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null)
  let loadingRepo = $state<string | null>(null)
  let copied = $state(false)
  let initPrompt = $state<string | null>(null) // repo that needs beads init
  let initResult = $state<string | null>(null) // PR URL after init

  const step = $derived<'setup' | 'authorize' | 'repos'>(
    $isConnected ? 'repos' : $ghDeviceCode ? 'authorize' : !$hasClientId ? 'setup' : 'setup'
  )

  async function handleStartFlow() {
    if (proxyInput.trim()) setProxyUrl(proxyInput.trim())
    if (clientIdInput.trim()) setClientId(clientIdInput.trim())
    const ok = await startDeviceFlow()
    if (ok) {
      repos = await fetchRepos()
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      repos = await fetchRepos()
      return
    }
    repos = await searchGhRepos(searchQuery.trim())
  }

  function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(handleSearch, 300)
  }

  async function selectRepo(fullName: string) {
    loadingRepo = fullName
    initPrompt = null
    initResult = null
    const result = await loadFromRepo(fullName)
    loadingRepo = null

    if (result === 'loaded') {
      onloaded?.()
    } else if (result === 'no-beads') {
      initPrompt = fullName
    }
  }

  async function handleInitBeads() {
    if (!initPrompt) return
    const prUrl = await initBeads(initPrompt)
    if (prUrl) {
      initResult = prUrl
      initPrompt = null
    }
  }

  function dismissInit() {
    initPrompt = null
    initResult = null
  }

  function handleDisconnect() {
    if (!confirm('Disconnect from GitHub? This will remove all GitHub-sourced projects.')) return
    disconnect()
    repos = []
  }

  function copyCode() {
    if ($ghDeviceCode) {
      navigator.clipboard.writeText($ghDeviceCode.user_code)
      copied = true
      setTimeout(() => { copied = false }, 2000)
    }
  }

  // auto-load repos when connected
  $effect(() => {
    if ($isConnected && repos.length === 0) {
      fetchRepos().then((r) => { repos = r })
    }
  })

  // sync inputs with store
  $effect(() => {
    if ($ghClientId) clientIdInput = $ghClientId
  })
  $effect(() => {
    if ($ghProxyUrl) proxyInput = $ghProxyUrl
  })
</script>

{#if step === 'repos'}
  <!-- Step 3: Pick a repo -->
  <div class="gh-section">
    <div class="gh-connected-banner">
      {#if $ghUser}
        <img class="gh-avatar" src={$ghUser.avatar_url} alt={$ghUser.login} width="36" height="36" />
        <div class="gh-connected-info">
          <p class="gh-connected-name">{$ghUser.name ?? $ghUser.login}</p>
          <p class="gh-connected-status"><span class="status-dot"></span> Connected</p>
        </div>
      {/if}
      <button class="disconnect-btn" onclick={handleDisconnect}>Disconnect</button>
    </div>
    <p class="gh-pick-label">Select a repo with <code>.beads/</code></p>

    <div class="repo-search">
      <input
        type="text"
        class="gh-input"
        bind:value={searchQuery}
        oninput={onSearchInput}
        placeholder="Search repos..."
      />
    </div>

    <div class="repo-list">
      {#if $ghLoading && repos.length === 0}
        <p class="repo-empty">Loading repos...</p>
      {:else if repos.length === 0}
        <p class="repo-empty">No repos found</p>
      {:else}
        {#each repos as repo}
          <button
            class="repo-item"
            class:repo-active={$ghRepos.includes(repo.full_name)}
            onclick={() => selectRepo(repo.full_name)}
            disabled={loadingRepo !== null}
          >
            <div class="repo-info">
              <span class="repo-name">{repo.full_name}</span>
              {#if repo.private}
                <span class="repo-badge">private</span>
              {/if}
              {#if $ghRepos.includes(repo.full_name)}
                <span class="repo-badge repo-badge-loaded">loaded</span>
              {/if}
            </div>
            {#if loadingRepo === repo.full_name}
              <span class="repo-loading">Loading...</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    {#if initPrompt}
      <div class="init-prompt">
        <p class="init-text">No <code>.beads/</code> found in <strong>{initPrompt}</strong></p>
        <p class="init-sub">Initialize beads? This creates a branch and opens a PR.</p>
        <div class="init-actions">
          <Button variant="primary" size="sm" onclick={handleInitBeads} disabled={$ghLoading}>
            {$ghLoading ? 'Creating PR...' : 'Initialize beads'}
          </Button>
          <button class="cancel-btn" onclick={dismissInit}>Cancel</button>
        </div>
      </div>
    {/if}

    {#if initResult}
      <div class="init-result">
        <p class="init-text">PR created!</p>
        <a class="init-link" href={initResult} target="_blank" rel="noopener">
          View pull request →
        </a>
      </div>
    {/if}

    {#if $ghError}
      <p class="gh-error">{$ghError}</p>
    {/if}
  </div>

{:else if step === 'authorize'}
  <!-- Step 2: Show code, waiting for user -->
  <div class="gh-section">
    <div class="gh-header">
      <span class="gh-icon">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
        </svg>
      </span>
      <div>
        <p class="gh-title">Authorize beadsmap</p>
        <p class="gh-sub">Enter this code on GitHub</p>
      </div>
    </div>

    {#if $ghDeviceCode}
      <div class="code-display">
        <button class="user-code" onclick={copyCode} title="Click to copy">
          {$ghDeviceCode.user_code}
        </button>
        <span class="copy-hint">{copied ? 'Copied!' : 'Click to copy'}</span>
      </div>

      <a
        class="verify-link"
        href={$ghDeviceCode.verification_uri}
        target="_blank"
        rel="noopener"
      >
        Open github.com/login/device →
      </a>

      <div class="poll-status">
        <span class="poll-dot"></span>
        <span class="poll-text">Waiting for authorization...</span>
      </div>

      <button class="cancel-btn" onclick={cancelDeviceFlow}>Cancel</button>
    {/if}

    {#if $ghError}
      <p class="gh-error">{$ghError}</p>
    {/if}
  </div>

{:else}
  <!-- Step 1: Enter Client ID (one-time setup) -->
  <div class="gh-section">
    <div class="gh-header">
      <span class="gh-icon">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
        </svg>
      </span>
      <div>
        <p class="gh-title">Connect to GitHub</p>
        <p class="gh-sub">One-time setup — enter your OAuth App Client ID</p>
      </div>
    </div>

    <div class="setup-fields">
      <div class="field-group">
        <span class="field-label">Proxy URL</span>
        <input
          type="text"
          class="gh-input"
          bind:value={proxyInput}
          placeholder="https://beadsmap-auth.workers.dev"
          autocomplete="off"
        />
      </div>
      <div class="field-group">
        <span class="field-label">Client ID</span>
        <div class="field-row">
          <input
            type="text"
            class="gh-input"
            bind:value={clientIdInput}
            placeholder="Ov23li..."
            autocomplete="off"
          />
          <Button
            variant="primary"
            size="sm"
            onclick={handleStartFlow}
            disabled={!clientIdInput.trim() || !proxyInput.trim() || $ghLoading}
          >
            {$ghLoading ? 'Starting...' : 'Connect'}
          </Button>
        </div>
      </div>
    </div>

    <div class="setup-help">
      <p class="setup-step">1. Deploy the <strong>auth proxy</strong> (Cloudflare Worker — see <code>proxy/worker.js</code>)</p>
      <p class="setup-step">2. Create an <a href="https://github.com/settings/applications/new" target="_blank" rel="noopener">OAuth App</a> with <strong>Device Flow</strong> enabled</p>
      <p class="setup-step">3. Enter both above — saved for next time</p>
    </div>

    {#if $ghError}
      <p class="gh-error">{$ghError}</p>
    {/if}
  </div>
{/if}

<style>
  .gh-section { display: flex; flex-direction: column; gap: 12px; }
  .gh-header { display: flex; align-items: center; gap: 10px; }
  .gh-icon { color: var(--color-text-muted); display: flex; }
  .gh-avatar { border-radius: 50%; }
  .gh-title { font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0; }
  .gh-sub { font-size: 12px; color: var(--color-text-faint); margin: 2px 0 0; }
  .gh-error { font-size: 12px; color: var(--color-risk); }

  .gh-input {
    width: 100%;
    padding: 6px 10px;
    border-radius: 6px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    box-sizing: border-box;
  }
  .gh-input:focus { outline: none; border-color: var(--color-accent); }
  .gh-input::placeholder { color: var(--color-text-faint); }

  /* Step 1: Setup */
  .setup-fields { display: flex; flex-direction: column; gap: 10px; }
  .field-group { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 11px; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.05em; }
  .field-row { display: flex; gap: 8px; }
  .setup-help { display: flex; flex-direction: column; gap: 4px; }
  .setup-step {
    font-size: 12px;
    color: var(--color-text-faint);
    margin: 0;
  }
  .setup-step a { color: var(--color-accent); text-decoration: none; }
  .setup-step a:hover { text-decoration: underline; }
  .setup-step strong { color: var(--color-text-muted); font-weight: 600; }

  /* Step 2: Authorize */
  .code-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
  }
  .user-code {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--color-text);
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 100ms;
  }
  .user-code:hover { background: var(--color-surface-2); }
  .copy-hint { font-size: 11px; color: var(--color-text-faint); }
  .verify-link {
    display: block;
    text-align: center;
    padding: 10px;
    background: var(--color-accent);
    color: var(--color-bar-text);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 100ms;
  }
  .verify-link:hover { opacity: 0.9; }
  .poll-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 0;
  }
  .poll-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-accent);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .poll-text { font-size: 12px; color: var(--color-text-muted); }
  .cancel-btn {
    background: none;
    border: none;
    font-size: 12px;
    color: var(--color-text-faint);
    cursor: pointer;
    font-family: inherit;
    text-align: center;
  }
  .cancel-btn:hover { color: var(--color-text-muted); }

  /* Step 3: Repos */
  .gh-connected-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
  }
  .gh-connected-info { flex: 1; min-width: 0; }
  .gh-connected-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }
  .gh-connected-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-done);
    margin: 2px 0 0;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-done);
    display: inline-block;
  }
  .gh-pick-label {
    font-size: 12px;
    color: var(--color-text-faint);
    margin: 0;
  }
  .gh-pick-label code { color: var(--color-accent); font-size: 11px; }
  .disconnect-btn {
    margin-left: auto;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 3px 10px;
    font-size: 11px;
    color: var(--color-text-muted);
    cursor: pointer;
    font-family: inherit;
  }
  .disconnect-btn:hover { color: var(--color-risk); border-color: var(--color-risk); }
  .repo-search { margin-top: 4px; }
  .repo-list {
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
  }
  .repo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: var(--color-text);
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    border-bottom: 1px solid var(--color-border-subtle);
    transition: background 100ms;
  }
  .repo-item:last-child { border-bottom: none; }
  .repo-item:hover { background: var(--color-surface-2); }
  .repo-item:disabled { opacity: 0.5; cursor: default; }
  .repo-active { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
  .repo-info { display: flex; align-items: center; gap: 8px; }
  .repo-name { font-weight: 500; }
  .repo-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--color-surface-2);
    color: var(--color-text-faint);
  }
  .repo-loading { font-size: 11px; color: var(--color-text-faint); }
  .repo-empty { font-size: 12px; color: var(--color-text-faint); padding: 16px; text-align: center; }
  .repo-badge-loaded { background: color-mix(in srgb, var(--color-done) 20%, transparent); color: var(--color-done); }

  /* Init prompt */
  .init-prompt, .init-result {
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
  }
  .init-text {
    font-size: 13px;
    color: var(--color-text);
    margin: 0;
  }
  .init-text code { color: var(--color-accent); font-size: 12px; }
  .init-text strong { font-weight: 600; }
  .init-sub { font-size: 12px; color: var(--color-text-faint); margin: 4px 0 0; }
  .init-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
  .init-link {
    display: inline-block;
    margin-top: 8px;
    font-size: 13px;
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 500;
  }
  .init-link:hover { text-decoration: underline; }
</style>
