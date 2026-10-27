# SONORA — Extração de Áudio com Precisão e Privacidade

Aplicação web para converter vídeos (`MP4`, `MOV`, `WEBM`, `MKV`, `AVI`) em faixas de áudio (`MP3`, `WAV`, `M4A`, `AAC`) com corte de trechos, ajuste de ganho, normalização de estúdio (`-16 LUFS`), reprodutor com forma de onda interativa e mascote capivara reativa.

---

## Arquitetura Híbrida (Vercel + Render)

O **SONORA** utiliza uma arquitetura dividida em duas frentes para combinar abertura instantânea com poder de processamento nativo:

1. **Frontend na Vercel (`dist/`)**:
   - Interface React 19 + TypeScript + Tailwind CSS v4 + Vite.
   - Inclui motor **Web Audio API + LameJS** que roda 100% no navegador como modo local ou fallback automático.
   - Ao abrir a página, envia um ping silencioso (`warmupNativeEngine`) para acordar a API do Render em segundo plano.

2. **Backend FFmpeg no Render (`server/index.mjs` + `Dockerfile`)**:
   - Servidor Node.js + FFmpeg nativo em container Docker Alpine.
   - Processa `MP3`, `WAV`, `M4A`, `AAC` e filtro `loudnorm` (`-16 LUFS`) sem retenção de arquivos (exclusão imediata após o streaming da resposta).

---

## Comandos de Desenvolvimento

- `npm install`: instala as dependências.
- `npm run dev`: inicia o servidor Vite com o plugin FFmpeg local acoplado.
- `npm run start:api`: inicia o servidor standalone da API FFmpeg (`server/index.mjs`) na porta `3001`.
- `npm run lint`: executa a verificação estática com Oxlint.
- `npm run build`: compila o TypeScript e gera o bundle de produção em `dist/`.

---

## Como Publicar (Vercel + Render)

### 1. Publicar o Backend no Render
1. Suba este repositório para o seu GitHub.
2. No painel do **Render**, clique em **New +** → **Web Service** (ou **Blueprint**) e selecione o repositório.
3. O Render usará automaticamente o `Dockerfile` e o `render.yaml` na raiz.
4. Copie a URL gerada pelo Render (ex.: `https://sonora-ffmpeg-api.onrender.com`).

### 2. Publicar o Frontend na Vercel
1. No painel da **Vercel**, clique em **Add New Project** e importe o mesmo repositório.
2. Em **Environment Variables**, adicione:
   - `VITE_API_BASE_URL` = `https://sonora-ffmpeg-api.onrender.com` *(sem barra no final)*
3. Clique em **Deploy**.
