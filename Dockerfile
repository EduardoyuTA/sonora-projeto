FROM node:22-alpine

# Instala FFmpeg com suporte a libmp3lame, AAC e PCM
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copia apenas o servidor de API nativo (zero dependências externas)
COPY package.json ./
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.mjs"]
