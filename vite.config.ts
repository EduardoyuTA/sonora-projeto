import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import {
  handleConvertRequest,
  handleHealthRequest,
} from './server/ffmpegHandler.mjs'
import { handleLinkDownloadRequest } from './server/linkDownloadHandler.mjs'

function sonoraFfmpegPlugin(): Plugin {
  return {
    name: 'sonora-ffmpeg-api',
    configureServer(server) {
      server.middlewares.use('/api/health', (req, res) => {
        handleHealthRequest(req, res)
      })

      server.middlewares.use('/api/convert', (req, res) => {
        handleConvertRequest(req, res)
      })

      server.middlewares.use('/api/download-link', (req, res) => {
        handleLinkDownloadRequest(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sonoraFfmpegPlugin()],
})
