import http from 'node:http'
import {
  applyCorsHeaders,
  handleConvertRequest,
  handleHealthRequest,
} from './ffmpegHandler.mjs'

const PORT = Number(process.env.PORT || 3001)
const ALLOWED_ORIGIN =
  process.env.CORS_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'

const server = http.createServer((req, res) => {
  const corsAllowed = applyCorsHeaders(req, res, ALLOWED_ORIGIN)

  if (!corsAllowed) {
    res.statusCode = 403
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Origem não autorizada pela política CORS.' }))
    return
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(
    req.url || '/',
    `http://${req.headers.host || 'localhost'}`
  )

  if (
    req.method === 'GET' &&
    (url.pathname === '/' || url.pathname === '/api/health')
  ) {
    handleHealthRequest(req, res)
    return
  }

  if (url.pathname === '/api/convert') {
    handleConvertRequest(req, res)
    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error: 'Rota não encontrada' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SONORA API] Servidor FFmpeg ativo na porta ${PORT}`)
})
