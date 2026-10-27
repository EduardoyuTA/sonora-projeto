import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT || 3001)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*'

const tempDir = path.join(os.tmpdir(), 'sonora-conversions')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

function setCorsHeaders(req, res) {
  const requestOrigin = req.headers.origin
  if (ALLOWED_ORIGIN === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else {
    const allowedList = ALLOWED_ORIGIN.split(',').map((o) => o.trim())
    if (requestOrigin && allowedList.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin)
      res.setHeader('Vary', 'Origin')
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedList[0] || '*')
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
    'X-Sonora-Engine, Content-Length, Content-Type'
  )
}

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {}
}

const server = http.createServer((req, res) => {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/api/health')) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'sonora-ffmpeg-api',
        engine: 'FFmpeg Native + Web Audio Hybrid',
        formats: ['mp3', 'wav', 'm4a', 'aac'],
        privacy: 'local-zero-retention',
      })
    )
    return
  }

  if (url.pathname === '/api/convert') {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Método não permitido' }))
      return
    }

    const format = String(req.headers['x-sonora-format'] || 'mp3').toLowerCase()
    const bitrate = String(req.headers['x-sonora-bitrate'] || '192')
    const startTime = parseFloat(String(req.headers['x-sonora-start'] || '0'))
    const endTime = parseFloat(String(req.headers['x-sonora-end'] || '0'))
    const volume = parseFloat(String(req.headers['x-sonora-volume'] || '100'))
    const normalize = String(req.headers['x-sonora-normalize'] || 'false') === 'true'
    const preserveOriginal = String(req.headers['x-sonora-preserve'] || 'false') === 'true'
    const originalExt = String(req.headers['x-sonora-ext'] || '.mp4').replace(
      /[^a-zA-Z0-9.]/g,
      ''
    )

    const validFormats = ['mp3', 'wav', 'm4a', 'aac']
    const safeFormat = validFormats.includes(format) ? format : 'mp3'

    const id = crypto.randomUUID()
    const inputPath = path.join(tempDir, `in-${id}${originalExt || '.mp4'}`)
    const outputPath = path.join(tempDir, `out-${id}.${safeFormat}`)

    const writeStream = fs.createWriteStream(inputPath)
    let aborted = false

    req.on('aborted', () => {
      aborted = true
      writeStream.destroy()
      safeUnlink(inputPath)
      safeUnlink(outputPath)
    })

    req.pipe(writeStream)

    writeStream.on('finish', () => {
      if (aborted) return

      const args = ['-y']

      if (!Number.isNaN(startTime) && startTime > 0) {
        args.push('-ss', startTime.toFixed(3))
      }

      args.push('-i', inputPath)

      if (!Number.isNaN(endTime) && endTime > 0 && endTime > startTime) {
        args.push('-to', (endTime - (startTime > 0 ? startTime : 0)).toFixed(3))
      }

      args.push('-vn')

      const filters = []
      if (!preserveOriginal) {
        if (!Number.isNaN(volume) && volume !== 100 && volume >= 0 && volume <= 200) {
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

      const safeBitrate = ['96', '128', '160', '192', '256', '320'].includes(bitrate)
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

      const ff = spawn('ffmpeg', args)
      let stderrLog = ''

      ff.stderr.on('data', (chunk) => {
        stderrLog += chunk.toString()
      })

      req.on('close', () => {
        if (!res.writableEnded) {
          ff.kill('SIGKILL')
        }
      })

      ff.on('close', (code) => {
        safeUnlink(inputPath)

        if (code !== 0 || !fs.existsSync(outputPath)) {
          safeUnlink(outputPath)
          res.statusCode = 422
          res.setHeader('Content-Type', 'application/json')
          const noAudio =
            stderrLog.includes('Output file does not contain any stream') ||
            stderrLog.includes('matches no streams')
          res.end(
            JSON.stringify({
              error: noAudio
                ? 'Este vídeo não possui uma faixa de áudio válida para extração.'
                : 'Não foi possível processar este arquivo de vídeo. Verifique se o arquivo está íntegro.',
            })
          )
          return
        }

        const stat = fs.statSync(outputPath)
        const mimeMap = {
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          m4a: 'audio/mp4',
          aac: 'audio/aac',
        }

        res.statusCode = 200
        res.setHeader('Content-Type', mimeMap[safeFormat] || 'application/octet-stream')
        res.setHeader('Content-Length', stat.size)
        res.setHeader('X-Sonora-Engine', 'ffmpeg-native')

        const readStream = fs.createReadStream(outputPath)
        readStream.pipe(res)
        readStream.on('close', () => {
          safeUnlink(outputPath)
        })
      })

      ff.on('error', () => {
        safeUnlink(inputPath)
        safeUnlink(outputPath)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Motor FFmpeg indisponível no servidor.' }))
      })
    })

    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Rota não encontrada' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SONORA API] Servidor FFmpeg ativo na porta ${PORT}`)
})
