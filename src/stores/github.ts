import { writable, derived, get } from 'svelte/store'
import type { GitHubUser, GitHubRepo, DeviceCodeResponse } from '../lib/github'
import {
  validateToken, listRepos, searchRepos,
  readBeadsFile, writeBeadsFile, initBeadsInRepo,
  requestDeviceCode, pollForToken,
  setProxy, getProxyUrl,
} from '../lib/github'
import { parseJSONL } from '../lib/parser'
import { addSource, getSource, exportSourceJSONL, sources, removeSource } from './issues'

const TOKEN_KEY = 'beadsmap-gh-token'
const CLIENT_ID_KEY = 'beadsmap-gh-client-id'

function stored(key: string): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(key) ?? ''
}

export const ghClientId = writable<string>(stored(CLIENT_ID_KEY))
export const ghToken = writable<string>(stored(TOKEN_KEY))
export const ghUser = writable<GitHubUser | null>(null)
export const ghLoading = writable<boolean>(false)
export const ghError = writable<string>('')

// device flow state
export const ghDeviceCode = writable<DeviceCodeResponse | null>(null)
export const ghPolling = writable<boolean>(false)

export const isConnected = derived([ghToken, ghUser], ([$token, $user]) => !!$token && !!$user)
export const hasClientId = derived(ghClientId, ($id) => !!$id)

// derived: list of connected GitHub repos (from sources)
export const ghRepos = derived(sources, ($sources) =>
  $sources.filter((s) => s.repo).map((s) => s.repo!)
)
export const hasRepo = derived(ghRepos, ($repos) => $repos.length > 0)

// persist
ghClientId.subscribe(($id) => {
  if (typeof localStorage === 'undefined') return
  if ($id) localStorage.setItem(CLIENT_ID_KEY, $id)
  else localStorage.removeItem(CLIENT_ID_KEY)
})

ghToken.subscribe(($token) => {
  if (typeof localStorage === 'undefined') return
  if ($token) localStorage.setItem(TOKEN_KEY, $token)
  else localStorage.removeItem(TOKEN_KEY)
})

export const ghProxyUrl = writable<string>(getProxyUrl())

let pollAbort: AbortController | null = null

export function setClientId(id: string) {
  ghClientId.set(id.trim())
}

export function setProxyUrl(url: string) {
  setProxy(url)
  ghProxyUrl.set(url)
}

export async function startDeviceFlow(): Promise<boolean> {
  const clientId = get(ghClientId)
  if (!clientId) {
    ghError.set('Client ID is required')
    return false
  }

  ghError.set('')
  ghLoading.set(true)

  try {
    const code = await requestDeviceCode(clientId)
    ghDeviceCode.set(code)
    ghLoading.set(false)

    ghPolling.set(true)
    pollAbort = new AbortController()

    const token = await pollForToken(clientId, code.device_code, code.interval, pollAbort.signal)
    ghToken.set(token)
    ghPolling.set(false)
    ghDeviceCode.set(null)

    const user = await validateToken(token)
    ghUser.set(user)
    return true
  } catch (e) {
    ghLoading.set(false)
    ghPolling.set(false)
    ghDeviceCode.set(null)
    if ((e as Error).message !== 'Cancelled') {
      ghError.set(e instanceof Error ? e.message : 'Device flow failed')
    }
    return false
  }
}

export function cancelDeviceFlow() {
  pollAbort?.abort()
  pollAbort = null
  ghPolling.set(false)
  ghDeviceCode.set(null)
  ghError.set('')
}

export async function reconnect(): Promise<boolean> {
  const token = get(ghToken)
  if (!token) return false
  ghError.set('')
  try {
    const user = await validateToken(token)
    ghUser.set(user)
    return true
  } catch {
    ghToken.set('')
    return false
  }
}

export async function fetchRepos(page = 1): Promise<GitHubRepo[]> {
  const token = get(ghToken)
  if (!token) return []
  return listRepos(token, page)
}

export async function searchGhRepos(query: string): Promise<GitHubRepo[]> {
  const token = get(ghToken)
  if (!token) return []
  return searchRepos(token, query)
}

export async function loadFromRepo(fullName: string): Promise<'loaded' | 'no-beads' | 'error'> {
  const token = get(ghToken)
  if (!token) return 'error'

  ghError.set('')
  ghLoading.set(true)
  const [owner, repo] = fullName.split('/')

  try {
    const result = await readBeadsFile(token, owner, repo)
    if (!result) {
      ghLoading.set(false)
      return 'no-beads'
    }
    const issues = parseJSONL(result.content)
    addSource({
      key: `github:${fullName}`,
      label: fullName,
      repo: fullName,
      sha: result.sha,
      issues,
    })
    ghLoading.set(false)
    return 'loaded'
  } catch (e) {
    ghError.set(e instanceof Error ? e.message : 'Failed to load issues')
    ghLoading.set(false)
    return 'error'
  }
}

export async function syncAllRepos(): Promise<boolean> {
  const token = get(ghToken)
  if (!token) return false

  ghError.set('')
  ghLoading.set(true)

  const currentSources = get(sources).filter((s) => s.repo)
  let allOk = true

  for (const source of currentSources) {
    const [owner, repo] = source.repo!.split('/')
    try {
      const content = exportSourceJSONL(source.key)
      await writeBeadsFile(token, owner, repo, content, source.sha ?? null, 'beadsmap: sync issues')
      // refresh sha
      const result = await readBeadsFile(token, owner, repo)
      if (result) {
        addSource({ ...source, sha: result.sha })
      }
    } catch (e) {
      ghError.set(e instanceof Error ? e.message : `Failed to sync ${source.repo}`)
      allOk = false
    }
  }

  ghLoading.set(false)
  return allOk
}

export async function initBeads(fullName: string): Promise<string | null> {
  const token = get(ghToken)
  if (!token) return null

  ghError.set('')
  ghLoading.set(true)
  const [owner, repo] = fullName.split('/')

  try {
    const prUrl = await initBeadsInRepo(token, owner, repo)
    ghLoading.set(false)
    return prUrl
  } catch (e) {
    ghError.set(e instanceof Error ? e.message : 'Failed to initialize beads')
    ghLoading.set(false)
    return null
  }
}

export function disconnect() {
  cancelDeviceFlow()
  // purge all GitHub-sourced projects from storage
  const current = get(sources)
  for (const s of current) {
    if (s.repo) removeSource(s.key)
  }
  ghToken.set('')
  ghUser.set(null)
  ghError.set('')
  localStorage.removeItem(TOKEN_KEY)
}
