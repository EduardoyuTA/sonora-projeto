import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import type { Plugin } from 'vite'

function sonoraFfmpegPlugin(): Plugin {
  const tempDir = path.join(os.tmpdir(), 'sonora-conversions')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  return {
    name: 'sonora-ffmpeg-api',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            status: 'ok',
            engine: 'FFmpeg 9.0 Native + Web Audio Hybrid',
            formats: ['mp3', 'wav', 'm4a', 'aac'],
            privacy: 'local-zero-retention',
          })
        )
      })

      server.middlewares.use('/api/convert', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
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
        const originalExt = String(req.headers['x-sonora-ext'] || '.mp4').replace(/[^a-zA-Z0-9.]/g, '')

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
          try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
          } catch {}
        })

        req.pipe(writeStream)

        writeStream.on('finish', () => {
          if (aborted) return

          const args: string[] = ['-y']

          if (!isNaN(startTime) && startTime > 0) {
            args.push('-ss', startTime.toFixed(3))
          }

          args.push('-i', inputPath)

          if (!isNaN(endTime) && endTime > 0 && endTime > startTime) {
            args.push('-t', (endTime - Math.max(0, startTime)).toFixed(3))
          }

          args.push('-vn') // Strip video stream

          // Audio filters (volume & normalization)
          const filters: string[] = []
          if (!preserveOriginal) {
            if (!isNaN(volume) && volume !== 100 && volume >= 0 && volume <= 200) {
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

          res.on('close', () => {
            if (!res.writableEnded) {
              ff.kill('SIGKILL')
            }
          })

          ff.on('close', (code) => {
            try {
              if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
            } catch {}

            if (code !== 0 || !fs.existsSync(outputPath)) {
              try {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
              } catch {}
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
            const mimeMap: Record<string, string> = {
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
              try {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
              } catch {}
            })
          })

          ff.on('error', () => {
            try {
              if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
            } catch {}
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Motor FFmpeg local indisponível.' }))
          })
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sonoraFfmpegPlugin()],
})
