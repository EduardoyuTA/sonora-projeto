import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import dns from 'node:dns/promises'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import {
  CONCAT_FORMAT,
  FFMPEG_TIMEOUT_MS,
  INTRO_BEATS_PATH,
  INTRO_MATCH_LOUDNESS,
  MAX_UPLOAD_BYTES,
  consumeRequestQuota,
  logJob,
  readPositiveInteger,
  releaseJobSlot,
  safeUnlink,
  sendJson,
  tempDir,
  tryReserveJob,
} from './ffmpegHandler.mjs'

const INTRO_SECONDS = 2.4
const MAX_LINK_DURATION_SECONDS = 30 * 60
const MAX_BODY_BYTES = 8 * 1024
const MAX_URL_LENGTH = 2048
const MAX_LOG_CHARS = 8192
const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp'
const LINK_DOWNLOAD_TIMEOUT_MS = readPositiveInteger(
  process.env.LINK_DOWNLOAD_TIMEOUT_MS,
  5 * 60_000,
  30 * 60_000
)
// Permite buscar os scripts que o yt-dlp usa no YouTube quando não estão instalados
const ALLOW_REMOTE_EJS = process.env.YTDLP_REMOTE_EJS === 'true'

// Prefere H.264 + AAC, que tocam em qualquer navegador sem conversão
const FORMAT_SELECTOR = [
  'bv*[vcodec^=avc1][height<=1080]+ba[acodec^=mp4a]',
  'b[vcodec^=avc1][height<=1080]',
  'bv*[height<=1080]+ba',
  'b[height<=1080]',
  'b',
].join('/')

const ERROR_STATUS = {
  invalid_url: 400,
  unsupported: 422,
  private: 422,
  unavailable: 422,
  blocked: 422,
  too_large: 413,
  too_long: 422,
  drm: 422,
  no_audio: 422,
  busy: 429,
  timeout: 504,
  failed: 502,
}

class LinkError extends Error {
  constructor(code, detail = '') {
    super(detail || code)
    this.code = code
  }
}

const isPrivateIpv4 = (address) => {
  const [a, b] = address.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

const isPrivateAddress = (address) => {
  if (net.isIPv4(address)) return isPrivateIpv4(address)
  const lower = address.toLowerCase()
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIpv4(mapped[1])
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  )
}

// Recusa endereços internos para o servidor não ser usado contra a própria rede
async function validateLink(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length > MAX_URL_LENGTH) {
    throw new LinkError('invalid_url')
  }
  let url
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new LinkError('invalid_url')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new LinkError('invalid_url')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new LinkError('invalid_url')
  }

  let addresses
  try {
    addresses = net.isIP(hostname)
      ? [{ address: hostname }]
      : await dns.lookup(hostname, { all: true })
  } catch {
    throw new LinkError('unavailable', 'dns')
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new LinkError('invalid_url')
  }
  return url.toString()
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new LinkError('invalid_url'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new LinkError('invalid_url'))
      }
    })
    req.on('error', () => reject(new LinkError('failed')))
  })
}

function runProcess(command, args, { timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const child = spawn(command, args, { windowsHide: true })

    const finish = (callback) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      callback()
    }
    const kill = () => {
      try {
        child.kill('SIGKILL')
      } catch {}
    }
    const onAbort = () => {
      kill()
      finish(() => reject(new LinkError('failed', 'aborted')))
    }
    const timer = setTimeout(() => {
      kill()
      finish(() => reject(new LinkError('timeout')))
    }, timeoutMs)

    signal.addEventListener('abort', onAbort, { once: true })
    child.stdout.on('data', (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-MAX_LOG_CHARS)
    })
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-MAX_LOG_CHARS)
    })
    child.on('error', () => finish(() => reject(new LinkError('failed', `${command} indisponível`))))
    child.on('close', (code) => finish(() => resolve({ code, stdout, stderr })))
  })
}

// Traduz as mensagens do yt-dlp para motivos que a interface explica bem
function classifyDownloadError(stderr) {
  const text = stderr.toLowerCase()
  const rules = [
    ['too_large', ['max-filesize', 'larger than max']],
    ['drm', ['drm']],
    ['blocked', ['not a bot', 'sign in to confirm', 'http error 429', 'too many requests']],
    [
      'private',
      [
        'private video',
        'login required',
        'requires authentication',
        'sign in to view',
        'members-only',
        'age-restricted',
        'confirm your age',
        'cookies',
      ],
    ],
    [
      'unavailable',
      [
        'unavailable',
        'has been removed',
        'not available',
        'does not exist',
        'http error 404',
        'http error 410',
      ],
    ],
    ['unsupported', ['unsupported url', 'no video formats found', 'unable to extract']],
    ['timeout', ['timed out', 'timeout']],
  ]
  const match = rules.find(([, terms]) => terms.some((term) => text.includes(term)))
  return match ? match[0] : 'failed'
}

async function probeStreams(filePath, signal) {
  const { code, stdout } = await runProcess(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', filePath],
    { timeoutMs: 30_000, signal }
  )
  if (code !== 0) throw new LinkError('failed', 'ffprobe')
  const streams = JSON.parse(stdout || '{}').streams || []
  const video = streams.find((stream) => stream.codec_type === 'video')
  const audio = streams.find((stream) => stream.codec_type === 'audio')
  return { video: video?.codec_name ?? null, audio: audio?.codec_name ?? null }
}

function buildFinishArgs(sourcePath, outputPath, streams, withIntroBeats) {
  const encodeVideo = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p']
  const encodeAudio = ['-c:a', 'aac', '-b:a', '192k']
  const output = ['-movflags', '+faststart', outputPath]

  if (withIntroBeats) {
    // O primeiro quadro fica parado enquanto as batidas tocam, mantendo a sincronia
    const introAudio =
      `[1:a:0]atrim=0:${INTRO_SECONDS},asetpts=PTS-STARTPTS,` +
      `apad=whole_dur=${INTRO_SECONDS},${CONCAT_FORMAT}[intro]`
    const mainAudio = `[0:a:0]${INTRO_MATCH_LOUDNESS},${CONCAT_FORMAT}[main]`
    const joined = '[intro][main]concat=n=2:v=0:a=1[a]'
    const filters = [introAudio, mainAudio, joined]
    const maps = ['-map', '[a]']
    if (streams.video) {
      filters.unshift(
        `[0:v:0]tpad=start_duration=${INTRO_SECONDS}:start_mode=clone,format=yuv420p[v]`
      )
      maps.unshift('-map', '[v]')
    }
    return [
      '-y',
      '-i',
      sourcePath,
      '-i',
      INTRO_BEATS_PATH,
      '-filter_complex',
      filters.join(';'),
      ...maps,
      ...(streams.video ? encodeVideo : []),
      ...encodeAudio,
      ...output,
    ]
  }

  const canCopyVideo = !streams.video || streams.video === 'h264'
  const canCopyAudio = streams.audio === 'aac'
  return [
    '-y',
    '-i',
    sourcePath,
    '-map',
    '0:v:0?',
    '-map',
    '0:a:0',
    ...(streams.video ? (canCopyVideo ? ['-c:v', 'copy'] : encodeVideo) : []),
    ...(canCopyAudio ? ['-c:a', 'copy'] : encodeAudio),
    ...output,
  ]
}

const cleanTitle = (title) =>
  Array.from(String(title || ''))
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'video-sonora'

export async function handleLinkDownloadRequest(req, res) {
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
    sendJson(res, 429, { code: 'busy', error: 'Muitos pedidos seguidos.' })
    return
  }

  if (!tryReserveJob()) {
    req.resume()
    sendJson(res, 429, { code: 'busy', error: 'O servidor está ocupado.' })
    return
  }

  const id = crypto.randomUUID()
  const outputPath = path.join(tempDir, `link-out-${id}.mp4`)
  const controller = new AbortController()
  let downloadedPath = null
  let released = false

  const cleanup = () => {
    if (downloadedPath) safeUnlink(downloadedPath)
    for (const entry of fs.readdirSync(tempDir)) {
      if (entry.startsWith(`link-${id}`)) safeUnlink(path.join(tempDir, entry))
    }
    safeUnlink(outputPath)
    if (!released) {
      released = true
      releaseJobSlot()
    }
  }

  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  try {
    const body = await readJsonBody(req)
    const url = await validateLink(body.url)
    const withIntroBeats = body.introBeats === true
    logJob('link_started', requestId, { host: new URL(url).hostname, withIntroBeats })

    const ytdlpArgs = [
      url,
      '--no-playlist',
      '--no-warnings',
      '--no-progress',
      '--no-cache-dir',
      '--no-part',
      '--restrict-filenames',
      '--socket-timeout',
      '20',
      '--retries',
      '2',
      '--max-filesize',
      String(MAX_UPLOAD_BYTES),
      '--match-filter',
      `!is_live & duration <=? ${MAX_LINK_DURATION_SECONDS}`,
      '-f',
      FORMAT_SELECTOR,
      '--merge-output-format',
      'mp4',
      '--js-runtimes',
      'node',
      '-o',
      path.join(tempDir, `link-${id}.%(ext)s`),
      '--print',
      'after_move:filepath',
      '--print',
      'after_move:title',
    ]
    if (ALLOW_REMOTE_EJS) ytdlpArgs.push('--remote-components', 'ejs:github')

    const download = await runProcess(YTDLP_BIN, ytdlpArgs, {
      timeoutMs: LINK_DOWNLOAD_TIMEOUT_MS,
      signal: controller.signal,
    })

    if (download.code !== 0) {
      throw new LinkError(classifyDownloadError(download.stderr), download.stderr.slice(-400))
    }

    const [printedPath, title] = download.stdout.trim().split(/\r?\n/)
    // Sem arquivo, o filtro recusou o vídeo: ao vivo ou longo demais
    if (!printedPath || !fs.existsSync(printedPath)) {
      throw new LinkError('too_long')
    }
    const resolvedPath = fs.realpathSync(printedPath)
    if (!resolvedPath.startsWith(fs.realpathSync(tempDir) + path.sep)) {
      throw new LinkError('failed', 'caminho inesperado')
    }
    downloadedPath = resolvedPath
    if (fs.statSync(downloadedPath).size > MAX_UPLOAD_BYTES) throw new LinkError('too_large')

    const streams = await probeStreams(downloadedPath, controller.signal)
    if (!streams.audio) throw new LinkError('no_audio')

    const finish = await runProcess(
      'ffmpeg',
      buildFinishArgs(downloadedPath, outputPath, streams, withIntroBeats),
      { timeoutMs: FFMPEG_TIMEOUT_MS, signal: controller.signal }
    )
    if (finish.code !== 0 || !fs.existsSync(outputPath)) {
      throw new LinkError('failed', finish.stderr.slice(-400))
    }
    safeUnlink(downloadedPath)

    const size = fs.statSync(outputPath).size
    res.statusCode = 200
    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Content-Length', size)
    res.setHeader('X-Sonora-Filename', encodeURIComponent(cleanTitle(title)))
    res.setHeader('X-Sonora-Intro', String(withIntroBeats))
    logJob('link_succeeded', requestId, { outputBytes: size, withIntroBeats })

    const stream = fs.createReadStream(outputPath)
    stream.on('close', cleanup)
    stream.on('error', () => {
      cleanup()
      if (!res.writableEnded) res.destroy()
    })
    stream.pipe(res)
  } catch (error) {
    cleanup()
    const code = error instanceof LinkError ? error.code : 'failed'
    logJob('link_failed', requestId, {
      code,
      detail: error instanceof Error ? error.message.slice(-300) : undefined,
    })
    if (!controller.signal.aborted) {
      sendJson(res, ERROR_STATUS[code] ?? 502, { code, requestId })
    }
  }
}
