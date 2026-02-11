/**
 * Solana Actions Server Middleware
 *
 * Express/Hono-compatible middleware for serving Solana Actions endpoints.
 */

import type { ActionSpec, ActionResponse, ActionHandler, ActionsJson } from './types'

/**
 * CORS headers required by the Solana Actions spec
 */
export const ACTION_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.1',
  'X-Blockchain-Ids': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
}

/**
 * Action route handler configuration
 */
export interface ActionRouteConfig {
  path: string
  getAction: (params: Record<string, string>) => ActionSpec | Promise<ActionSpec>
  postAction: ActionHandler
}

/**
 * Create an Express-compatible middleware for Solana Actions
 */
export function createActionsMiddleware(
  routes: ActionRouteConfig[],
  actionsJson?: ActionsJson
): (req: any, res: any, next?: () => void) => void {
  return function actionsMiddleware(req: any, res: any, next?: () => void): void {
    // Set CORS headers
    for (const [key, value] of Object.entries(ACTION_CORS_HEADERS)) {
      res.setHeader(key, value)
    }

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname

    // Serve actions.json
    if (pathname === '/actions.json') {
      const manifest = actionsJson || {
        rules: routes.map(r => ({
          pathPattern: r.path,
          apiPath: `/api/actions${r.path}`,
        })),
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(manifest))
      return
    }

    // Find matching route
    const route = routes.find(r => {
      const routePath = `/api/actions${r.path}`
      return pathname === routePath || pathname.startsWith(routePath + '?')
    })

    if (!route) {
      if (next) return next()
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Action not found' }))
      return
    }

    const params = Object.fromEntries(url.searchParams.entries())

    if (req.method === 'GET') {
      Promise.resolve(route.getAction(params))
        .then(spec => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(spec))
        })
        .catch(err => {
          res.writeHead(500)
          res.end(JSON.stringify({ error: err.message }))
        })
      return
    }

    if (req.method === 'POST') {
      let body = ''
      req.on('data', (chunk: string) => { body += chunk })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          const account = parsed.account

          if (!account) {
            res.writeHead(400)
            res.end(JSON.stringify({ error: 'Missing account field' }))
            return
          }

          route.postAction(account, params)
            .then(response => {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(response))
            })
            .catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
        } catch {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'Invalid request body' }))
        }
      })
      return
    }

    if (next) return next()
    res.writeHead(405)
    res.end(JSON.stringify({ error: 'Method not allowed' }))
  }
}

/**
 * Create a simple Bun-compatible server for Solana Actions
 */
/**
 * Actions server configuration
 */
export interface ActionsServerConfig {
  port: number
  routes: ActionRouteConfig[]
  actionsJson: ActionsJson | undefined
  fetch: (request: Request) => Promise<Response>
}

export function createActionsServer(
  routes: ActionRouteConfig[],
  options: { port?: number; actionsJson?: ActionsJson } = {}
): ActionsServerConfig {
  const port: number = options.port ?? 3000
  const actionsJson: ActionsJson | undefined = options.actionsJson

  return {
    port: port,
    routes: routes,
    actionsJson: actionsJson,

    /**
     * Handle a fetch request (for Bun.serve or similar)
     */
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url)
      const headers = new Headers(ACTION_CORS_HEADERS)
      headers.set('Content-Type', 'application/json')

      // OPTIONS
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers })
      }

      // actions.json
      if (url.pathname === '/actions.json') {
        const manifest = actionsJson || {
          rules: routes.map(r => ({
            pathPattern: r.path,
            apiPath: `/api/actions${r.path}`,
          })),
        }
        return new Response(JSON.stringify(manifest), { headers })
      }

      // Find route
      const route = routes.find(r => {
        const routePath = `/api/actions${r.path}`
        return url.pathname === routePath
      })

      if (!route) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
      }

      const params = Object.fromEntries(url.searchParams.entries())

      if (request.method === 'GET') {
        try {
          const spec = await route.getAction(params)
          return new Response(JSON.stringify(spec), { headers })
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
        }
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json() as { account?: string }
          if (!body.account) {
            return new Response(JSON.stringify({ error: 'Missing account' }), { status: 400, headers })
          }
          const response = await route.postAction(body.account, params)
          return new Response(JSON.stringify(response), { headers })
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
        }
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
    },
  }
}
