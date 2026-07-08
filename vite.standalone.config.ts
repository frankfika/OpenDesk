// Standalone Vite config for the renderer (no Electron, no main/preload).
// Used when running `vite --config vite.standalone.config.ts` for a quick
// UI-only preview in the browser.
import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// CORS-bypass middleware: forwards /api/{rpc,coingecko,ens,base,arb,op,polygon,bsc,zksync,linea,scroll,mantle}
// to public upstream endpoints so the browser can call them without CORS errors.
function apiProxyPlugin(): Plugin {
  const ROUTES: Array<{ prefix: string; upstream: string; strip: number }> = [
    { prefix: '/api/rpc', upstream: 'https://eth.merkle.io', strip: '/api/rpc'.length },
    { prefix: '/api/ens', upstream: 'https://api.ensideas.com', strip: '/api/ens'.length },
    { prefix: '/api/base', upstream: 'https://base.publicnode.com', strip: '/api/base'.length },
    { prefix: '/api/arb', upstream: 'https://arbitrum-one.publicnode.com', strip: '/api/arb'.length },
    { prefix: '/api/op', upstream: 'https://optimism.publicnode.com', strip: '/api/op'.length },
    { prefix: '/api/polygon', upstream: 'https://polygon-bor.publicnode.com', strip: '/api/polygon'.length },
    { prefix: '/api/bsc', upstream: 'https://bsc.publicnode.com', strip: '/api/bsc'.length },
    { prefix: '/api/zksync', upstream: 'https://mainnet.era.zksync.io', strip: '/api/zksync'.length },
    { prefix: '/api/linea', upstream: 'https://linea.drpc.org', strip: '/api/linea'.length },
    { prefix: '/api/scroll', upstream: 'https://scroll.drpc.org', strip: '/api/scroll'.length },
    { prefix: '/api/mantle', upstream: 'https://mantle.drpc.org', strip: '/api/mantle'.length }
  ]

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url || ''
    const route = ROUTES.find((r) => url === r.prefix || url.startsWith(r.prefix + '/') || url.startsWith(r.prefix + '?'))
    if (!route) return next()

    const pathPart = url.slice(route.strip) || '/'
    const target = route.upstream + pathPart
    console.log(`[api-proxy] ${req.method} ${url} -> ${target}`)
    try {
      // Read body for POSTs (RPC + coingecko both allow GETs but RPCs are POSTs)
      let body: BodyInit | undefined
      const headers: Record<string, string> = { 'user-agent': 'opendesk-workbench' }
      if (req.method === 'POST' || req.method === 'PUT') {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        body = Buffer.concat(chunks)
        if (req.headers['content-type']) headers['content-type'] = String(req.headers['content-type'])
      }

      const r = await fetch(target, { method: req.method, headers, body })
      const buf = Buffer.from(await r.arrayBuffer())
      res.statusCode = r.status
      const ct = r.headers.get('content-type')
      if (ct) res.setHeader('content-type', ct)
      res.setHeader('access-control-allow-origin', '*')
      res.setHeader('cache-control', 'public, max-age=30')
      res.end(buf)
    } catch (e) {
      const err = e as Error & { cause?: unknown }
      console.error(`[api-proxy] ${req.method} ${target} -> ${err.message}`, err.cause)
      res.statusCode = 502
      res.setHeader('access-control-allow-origin', '*')
      res.end(`proxy error: ${err.message}`)
    }
  }

  return {
    name: 'opendesk-api-proxy',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    }
  }
}

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  plugins: [react(), apiProxyPlugin()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false
  },
  build: {
    outDir: resolve(__dirname, 'dist-standalone'),
    emptyOutDir: true
  }
})
