// Cloudflare Worker — proxies GitHub OAuth device flow endpoints
// Deploy: npx wrangler deploy proxy/worker.js --name beadsmap-auth

const ALLOWED = [
  'https://github.com/login/device/code',
  'https://github.com/login/oauth/access_token',
]

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors() })
    }

    const url = new URL(request.url)
    const target = url.searchParams.get('url')

    if (!target || !ALLOWED.includes(target)) {
      return new Response('Forbidden', { status: 403, headers: cors() })
    }

    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: request.body,
    })

    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: {
        ...cors(),
        'Content-Type': 'application/json',
      },
    })
  },
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}
