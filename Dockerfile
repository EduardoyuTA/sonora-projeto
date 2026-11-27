FROM node:22-alpine

# Instala FFmpeg com suporte a libmp3lame, AAC e PCM
# e o yt-dlp, com os componentes que ele usa no YouTube, para baixar por link
RUN apk add --no-cache ffmpeg python3 py3-pip \n  && pip install --no-cache-dir --break-system-packages "yt-dlp[default]"

WORKDIR /app

# Copia apenas o servidor de API nativo (zero dependências externas)
COPY package.json ./
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.mjs"]
