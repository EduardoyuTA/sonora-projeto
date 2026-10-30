import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024 // 500 MB
function readPositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, maximum)
}

const MAX_CONCURRENT_JOBS = readPositiveInteger(
  process.env.MAX_CONCURRENT_JOBS,
  4,
  32
)
const FFMPEG_TIMEOUT_MS = readPositiveInteger(
  process.env.FFMPEG_TIMEOUT_MS,
  180_000,
  15 * 60_000
)
const UPLOAD_TIMEOUT_MS = readPositiveInteger(
  process.env.UPLOAD_TIMEOUT_MS,
  5 * 60_000,
  30 * 60_000
)
const RATE_LIMIT_WINDOW_MS = readPositiveInteger(
  process.env.RATE_LIMIT_WINDOW_MS,
  60_000,
  60 * 60_000
)
const MAX_REQUESTS_PER_WINDOW = readPositiveInteger(
  process.env.MAX_REQUESTS_PER_WINDOW,
  12,
  1_000
)
const MAX_STDERR_CHARS = 8192

const tempDir = path.join(os.tmpdir(), 'sonora-conversions')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

function purgeStaleTempFiles() {
  try {
    const now = Date.now()
    const entries = fs.readdirSync(tempDir)
    for (const entry of entries) {
      const fullPath = path.join(tempDir, entry)
      try {
        const stat = fs.statSync(fullPath)
        if (now - stat.mtimeMs > 30 * 60 * 1000) {
          fs.unlinkSync(fullPath)
        }
      } catch {}
    }
  } catch {}
}

purgeStaleTempFiles()

export function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {}
}

export function applyCorsHeaders(req, res, allowedOrigin = '*') {
  const requestOrigin = req.headers.origin
  if (allowedOrigin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else {
    const allowedList = allowedOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    if (requestOrigin && allowedList.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin)
      res.setHeader('Vary', 'Origin')
    } else if (!requestOrigin && allowedList.length > 0) {
      res.setHeader('Vary', 'Origin')
    } else {
      res.setHeader('Vary', 'Origin')
      return false
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    [
      'Content-Type',
      'x-sonora-format',
      'x-sonora-bitrate',
      'x-sonora-start',
      'x-sonora-end',
      'x-sonora-volume',
      'x-sonora-normalize',
      'x-sonora-preserve',
      'x-sonora-ext',
    ].join(', ')
  )
  res.setHeader(
    'Access-Control-Expose-Headers',
    'X-Sonora-Engine, Content-Length, Content-Type, X-Request-Id'
  )
  return true
}

function sendJson(res, statusCode, payload) {
  if (res.headersSent || res.writableEnded) return
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function handleHealthRequest(_req, res) {
  sendJson(res, 200, {
    status: 'ok',
    service: 'sonora-ffmpeg-api',
    engine: 'FFmpeg Native + Web Audio Hybrid',
    formats: ['mp3', 'wav', 'm4a', 'aac'],
    privacy: 'ephemeral-zero-retention',
    maxUploadBytes: MAX_UPLOAD_BYTES,
  })
}

let activeJobs = 0
const requestWindows = new Map()

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim()
  return forwarded || req.socket.remoteAddress || 'unknown'
}

function consumeRequestQuota(req) {
  const now = Date.now()
  if (requestWindows.size > 10_000) {
    for (const [storedKey, window] of requestWindows) {
      if (window.resetAt <= now) requestWindows.delete(storedKey)
    }
  }
  const key = getClientIp(req)
  const current = requestWindows.get(key)
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count++
  return { allowed: true, retryAfterSeconds: 0 }
}

function logJob(event, requestId, details = {}) {
  console.info(
    JSON.stringify({
      service: 'sonora-ffmpeg-api',
      event,
      requestId,
      timestamp: new Date().toISOString(),
      ...details,
    })
  )
}

export function handleConvertRequest(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido' })
    return
  }

  const requestId = crypto.randomUUID()
  res.setHeader('X-Request-Id', requestId)

  const quota = consumeRequestQuota(req)
  if (!quota.allowed) {
    req.resume()
    res.setHeader('Retry-After', quota.retryAfterSeconds)
    sendJson(res, 429, {
      error: 'Muitas conversões iniciadas deste endereço. Aguarde antes de tentar novamente.',
      requestId,
    })
    logJob('rate_limited', requestId)
    return
  }

  const declaredLength = Number(req.headers['content-length'] || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    req.resume()
    sendJson(res, 413, {
      error: 'O arquivo excede o limite máximo permitido de 500 MB.',
    })
    return
  }

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    req.resume()
    sendJson(res, 429, {
      error:
        'O motor de conversão está ocupado com outras tarefas no momento. Tente novamente em alguns segundos.',
    })
    return
  }

  activeJobs++
  logJob('upload_started', requestId, { activeJobs })
  let jobReleased = false
  const releaseJob = () => {
    if (!jobReleased) {
      jobReleased = true
      activeJobs = Math.max(0, activeJobs - 1)
    }
  }

  const format = String(req.headers['x-sonora-format'] || 'mp3').toLowerCase()
  const bitrate = String(req.headers['x-sonora-bitrate'] || '192')
  const startTime = parseFloat(String(req.headers['x-sonora-start'] || '0'))
  const endTime = parseFloat(String(req.headers['x-sonora-end'] || '0'))
  const volume = parseFloat(String(req.headers['x-sonora-volume'] || '100'))
  const normalize = String(req.headers['x-sonora-normalize'] || 'false') === 'true'
  const preserveOriginal =
    String(req.headers['x-sonora-preserve'] || 'false') === 'true'
  const rawExt = String(req.headers['x-sonora-ext'] || '.mp4').replace(
    /[^a-zA-Z0-9.]/g,
    ''
  )
  const originalExt =
    rawExt.startsWith('.') && rawExt.length <= 10 ? rawExt : '.mp4'

  const validFormats = ['mp3', 'wav', 'm4a', 'aac']
  const safeFormat = validFormats.includes(format) ? format : 'mp3'

  const id = crypto.randomUUID()
  const inputPath = path.join(tempDir, `in-${id}${originalExt}`)
  const outputPath = path.join(tempDir, `out-${id}.${safeFormat}`)

  const writeStream = fs.createWriteStream(inputPath)
  let aborted = false
  let ffProcess = null
  let timeoutId = null
  let uploadTimeoutId = null
  let receivedBytes = 0

  const cleanupAll = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (uploadTimeoutId !== null) {
      clearTimeout(uploadTimeoutId)
      uploadTimeoutId = null
    }
    if (ffProcess && ffProcess.exitCode === null && !ffProcess.killed) {
      try {
        ffProcess.kill('SIGKILL')
      } catch {}
    }
    safeUnlink(inputPath)
    safeUnlink(outputPath)
    releaseJob()
  }

  const handleAbort = () => {
    if (aborted) return
    aborted = true
    writeStream.destroy()
    cleanupAll()
    logJob('request_aborted', requestId)
  }

  uploadTimeoutId = setTimeout(() => {
    if (aborted) return
    aborted = true
    req.unpipe(writeStream)
    writeStream.destroy()
    cleanupAll()
    sendJson(res, 408, {
      error: 'Tempo limite de upload excedido. Verifique sua conexão e tente novamente.',
      requestId,
    })
    req.resume()
    logJob('upload_timeout', requestId, { receivedBytes })
  }, UPLOAD_TIMEOUT_MS)

  req.on('aborted', handleAbort)
  res.on('close', () => {
    if (!res.writableEnded) {
      handleAbort()
    }
  })

  req.on('error', () => {
    handleAbort()
  })

  writeStream.on('error', () => {
    if (aborted) return
    aborted = true
    cleanupAll()
    sendJson(res, 500, {
      error: 'Falha ao gravar arquivo temporário para conversão.',
    })
  })

  req.on('data', (chunk) => {
    if (aborted) return
    receivedBytes += chunk.length
    if (receivedBytes > MAX_UPLOAD_BYTES) {
      aborted = true
      req.unpipe(writeStream)
      writeStream.destroy()
      cleanupAll()
      sendJson(res, 413, {
        error: 'O arquivo excede o limite máximo permitido de 500 MB.',
        requestId,
      })
      req.resume()
      logJob('upload_too_large', requestId, { receivedBytes })
    }
  })

  req.pipe(writeStream)

  writeStream.on('finish', () => {
    if (aborted) return

    if (uploadTimeoutId !== null) {
      clearTimeout(uploadTimeoutId)
      uploadTimeoutId = null
    }
    logJob('upload_finished', requestId, { receivedBytes })

    if (receivedBytes === 0) {
      aborted = true
      cleanupAll()
      sendJson(res, 400, { error: 'O arquivo enviado está vazio (0 bytes).' })
      return
    }

    const args = ['-y']

    if (!Number.isNaN(startTime) && startTime > 0) {
      args.push('-ss', startTime.toFixed(3))
    }

    args.push('-i', inputPath)

    if (!Number.isNaN(endTime) && endTime > 0 && endTime > startTime) {
      args.push('-t', (endTime - Math.max(0, startTime)).toFixed(3))
    }

    args.push('-vn')

    const filters = []
    if (!preserveOriginal) {
      if (
        !Number.isNaN(volume) &&
        volume !== 100 &&
        volume >= 0 &&
        volume <= 200
      ) {
        const volFactor = (volume / 100).toFixed(2)
        filters.push(`volume=${volFactor}`)
      }
      if (normalize) {
        filters.push('loudnorm=I=-16:TP=-1.5:LRA=11')
      }
    }

    if (filters.length > 0) {
      args.push('-af', filters.join(','))
    }

    const safeBitrate = ['96', '128', '160', '192', '256', '320'].includes(
      bitrate
    )
      ? `${bitrate}k`
      : '192k'

    if (safeFormat === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', safeBitrate)
    } else if (safeFormat === 'wav') {
      args.push('-c:a', 'pcm_s16le', '-ar', '44100')
    } else if (safeFormat === 'm4a') {
      args.push('-c:a', 'aac', '-b:a', safeBitrate, '-movflags', '+faststart')
    } else if (safeFormat === 'aac') {
      args.push('-c:a', 'aac', '-b:a', safeBitrate, '-f', 'adts')
    }

    args.push(outputPath)

    let ffSettled = false
    let stderrLog = ''

    const ff = spawn('ffmpeg', args)
    ffProcess = ff

    timeoutId = setTimeout(() => {
      if (ffSettled || aborted) return
      ffSettled = true
      aborted = true
      cleanupAll()
      sendJson(res, 504, {
        error:
          'Tempo limite de processamento excedido. Tente recortar um trecho menor do vídeo.',
      })
      logJob('ffmpeg_timeout', requestId)
    }, FFMPEG_TIMEOUT_MS)

    ff.stderr.on('data', (chunk) => {
      stderrLog += chunk.toString()
      if (stderrLog.length > MAX_STDERR_CHARS) {
        stderrLog = stderrLog.slice(-MAX_STDERR_CHARS)
      }
    })

    ff.on('error', () => {
      if (ffSettled || aborted) return
      ffSettled = true
      cleanupAll()
      sendJson(res, 500, {
        error: 'Motor FFmpeg indisponível no servidor.',
      })
      logJob('ffmpeg_unavailable', requestId)
    })

    ff.on('close', (code) => {
      if (ffSettled || aborted) return
      ffSettled = true

      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      safeUnlink(inputPath)

      if (code !== 0 || !fs.existsSync(outputPath)) {
        cleanupAll()
        const noAudio =
          stderrLog.includes('Output file does not contain any stream') ||
          stderrLog.includes('matches no streams')
        sendJson(res, 422, {
          error: noAudio
            ? 'Este vídeo não possui uma faixa de áudio válida para extração.'
            : 'Não foi possível processar este arquivo de vídeo. Verifique se o arquivo está íntegro.',
        })
        logJob('conversion_failed', requestId, { code })
        return
      }

      let stat
      try {
        stat = fs.statSync(outputPath)
      } catch {
        cleanupAll()
        sendJson(res, 500, {
          error: 'Falha ao ler o arquivo de áudio convertido.',
        })
        return
      }

      const mimeMap = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
      }

      res.statusCode = 200
      res.setHeader(
        'Content-Type',
        mimeMap[safeFormat] || 'application/octet-stream'
      )
      res.setHeader('Content-Length', stat.size)
      res.setHeader('X-Sonora-Engine', 'ffmpeg-native')
      logJob('conversion_succeeded', requestId, {
        format: safeFormat,
        outputBytes: stat.size,
      })

      const readStream = fs.createReadStream(outputPath)
      readStream.on('error', () => {
        cleanupAll()
        if (!res.writableEnded) {
          res.destroy()
        }
      })
      readStream.on('close', () => {
        cleanupAll()
      })
      readStream.pipe(res)
    })
  })
}
