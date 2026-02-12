const API = 'https://api.github.com'
const GITHUB = 'https://github.com'

// CORS proxy for OAuth endpoints (github.com doesn't send CORS headers)
// Set via localStorage or hardcode your deployed proxy URL
const PROXY_KEY = 'beadsmap-gh-proxy'
const DEFAULT_PROXY = ''

function getProxy(): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(PROXY_KEY) ?? DEFAULT_PROXY
  }
  return DEFAULT_PROXY
}

export function setProxy(url: string) {
  if (typeof localStorage !== 'undefined') {
    if (url) localStorage.setItem(PROXY_KEY, url.replace(/\/$/, ''))
    else localStorage.removeItem(PROXY_KEY)
  }
}

export function getProxyUrl(): string {
  return getProxy()
}

async function proxyPost(target: string, body: unknown): Promise<Response> {
  const proxy = getProxy()
  if (!proxy) {
    // try direct (works from non-browser or if CORS ever gets added)
    return fetch(target, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return fetch(`${proxy}?url=${encodeURIComponent(target)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

export interface GitHubRepo {
  full_name: string
  name: string
  owner: { login: string }
  private: boolean
  default_branch: string
  pushed_at: string
}

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface ContentFile {
  content: string
  sha: string
  encoding: string
}

function apiHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// --- Device Flow ---

export async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
  const res = await proxyPost(`${GITHUB}/login/device/code`, {
    client_id: clientId,
    scope: 'repo',
  })
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`)
  return res.json()
}

export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number,
  signal?: AbortSignal
): Promise<string> {
  const pollInterval = Math.max(interval, 5) * 1000

  while (true) {
    if (signal?.aborted) throw new Error('Cancelled')

    await new Promise((r) => setTimeout(r, pollInterval))

    const res = await proxyPost(`${GITHUB}/login/oauth/access_token`, {
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    if (!res.ok) throw new Error(`Token poll failed: ${res.status}`)

    const data = await res.json()

    if (data.access_token) return data.access_token
    if (data.error === 'authorization_pending') continue
    if (data.error === 'slow_down') {
      // back off by 5 seconds as GitHub requests
      await new Promise((r) => setTimeout(r, 5000))
      continue
    }
    if (data.error === 'expired_token') throw new Error('Code expired — please try again')
    if (data.error === 'access_denied') throw new Error('Access denied by user')
    throw new Error(data.error_description ?? data.error ?? 'Unknown error')
  }
}

// --- API ---

export async function validateToken(token: string): Promise<GitHubUser> {
  const res = await fetch(`${API}/user`, { headers: apiHeaders(token) })
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token' : `GitHub API error: ${res.status}`)
  return res.json()
}

export async function listRepos(token: string, page = 1): Promise<GitHubRepo[]> {
  const params = new URLSearchParams({
    sort: 'pushed',
    per_page: '30',
    page: String(page),
  })
  const res = await fetch(`${API}/user/repos?${params}`, { headers: apiHeaders(token) })
  if (!res.ok) throw new Error(`Failed to list repos: ${res.status}`)
  return res.json()
}

export async function searchRepos(token: string, query: string): Promise<GitHubRepo[]> {
  const params = new URLSearchParams({
    q: `${query} in:name fork:true`,
    sort: 'updated',
    per_page: '10',
  })
  const res = await fetch(`${API}/search/repositories?${params}`, { headers: apiHeaders(token) })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json()
  return data.items
}

export async function readBeadsFile(
  token: string,
  owner: string,
  repo: string,
  branch?: string
): Promise<{ content: string; sha: string } | null> {
  const path = '.beads/issues.jsonl'
  const url = branch
    ? `${API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    : `${API}/repos/${owner}/${repo}/contents/${path}`

  const res = await fetch(url, { headers: apiHeaders(token) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to read file: ${res.status}`)

  const data: ContentFile = await res.json()
  const content = atob(data.content.replace(/\n/g, ''))
  return { content, sha: data.sha }
}

export async function writeBeadsFile(
  token: string,
  owner: string,
  repo: string,
  content: string,
  sha: string | null,
  message: string,
  branch?: string
): Promise<void> {
  const path = '.beads/issues.jsonl'
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  }
  if (sha) body.sha = sha
  if (branch) body.branch = branch

  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Failed to write file: ${res.status}`)
  }
}

// --- Init Beads (branch + PR) ---

async function getDefaultBranch(token: string, owner: string, repo: string): Promise<string> {
  const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: apiHeaders(token) })
  if (!res.ok) throw new Error(`Failed to get repo info: ${res.status}`)
  const data = await res.json()
  return data.default_branch
}

async function getBranchSha(token: string, owner: string, repo: string, branch: string): Promise<string> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers: apiHeaders(token) })
  if (!res.ok) throw new Error(`Failed to get branch ref: ${res.status}`)
  const data = await res.json()
  return data.object.sha
}

async function createBranch(token: string, owner: string, repo: string, branch: string, sha: string): Promise<void> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  })
  if (!res.ok) throw new Error(`Failed to create branch: ${res.status}`)
}

async function createFile(
  token: string, owner: string, repo: string,
  path: string, content: string, message: string, branch: string
): Promise<void> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: apiHeaders(token),
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch,
    }),
  })
  if (!res.ok) throw new Error(`Failed to create ${path}: ${res.status}`)
}

async function createPR(
  token: string, owner: string, repo: string,
  head: string, base: string, title: string, body: string
): Promise<string> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({ title, body, head, base }),
  })
  if (!res.ok) throw new Error(`Failed to create PR: ${res.status}`)
  const data = await res.json()
  return data.html_url
}

export async function initBeadsInRepo(
  token: string,
  owner: string,
  repo: string,
  prefix?: string
): Promise<string> {
  const defaultBranch = await getDefaultBranch(token, owner, repo)
  const baseSha = await getBranchSha(token, owner, repo, defaultBranch)
  const branchName = 'init-beads'

  await createBranch(token, owner, repo, branchName, baseSha)

  const repoPrefix = prefix ?? repo.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)
  const configContent = `# Beads Configuration\n# Issue prefix for this repo\nissue-prefix: "${repoPrefix}"\n`
  const issuesContent = ''

  await createFile(token, owner, repo, '.beads/config.yaml', configContent, 'init: add beads config', branchName)
  await createFile(token, owner, repo, '.beads/issues.jsonl', issuesContent, 'init: add empty issues file', branchName)

  const prUrl = await createPR(
    token, owner, repo,
    branchName, defaultBranch,
    'Initialize beads issue tracking',
    '## Summary\n\nInitializes [beads](https://github.com/dariye/beads) issue tracking in this repository.\n\n### Added\n- `.beads/config.yaml` — configuration with prefix `' + repoPrefix + '`\n- `.beads/issues.jsonl` — empty issues file\n\nMerge this PR to start tracking issues with beads.'
  )

  return prUrl
}
