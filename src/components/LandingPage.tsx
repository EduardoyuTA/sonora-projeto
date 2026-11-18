import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  AudioWaveform,
  Check,
  ChevronDown,
  Download,
  HardDrive,
  Server,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Capybara } from './Capybara'
import { MAX_FILE_SIZE_LABEL } from '../utils/formatters'
import {
  bindReveals,
  bindScrollScene,
  primeVideoOnTouch,
  waitForVideo,
} from '../utils/scrollScene'
import '../landing.css'

interface LandingPageProps {
  onEnter: () => void
  reducedMotion: boolean
}

const HERO_HOLD_END = 0.08

const buildWave = (count: number, seed: number) =>
  Array.from({ length: count }, (_, index) => {
    const position = index / (count - 1)
    const envelope = Math.pow(Math.sin(Math.PI * position), 0.7)
    const detail = Math.abs(
      Math.sin(index * 0.73 + seed) * Math.cos(index * 0.19 + seed * 2)
    )
    return Math.max(10, Math.round(envelope * (30 + detail * 70)))
  })

const HERO_WAVE = buildWave(96, 1.4)
const EDIT_WAVE = buildWave(44, 2.6)
const RESULT_WAVE = buildWave(44, 4.1)
const TRIM_WAVE = buildWave(28, 5.3)

const Wave: React.FC<{ bars: number[]; className?: string }> = ({
  bars,
  className = '',
}) => (
  <div className={`l-wave ${className}`} aria-hidden="true">
    {bars.map((height, index) => (
      <i key={index} style={{ height: `${height}%` }} />
    ))}
  </div>
)

const Brand: React.FC = () => (
  <span className="l-brand">
    <span className="l-brand__mark">
      <AudioWaveform aria-hidden="true" />
    </span>
    SONORA
  </span>
)

const QUESTIONS = [
  {
    question: 'Quais formatos o Sonora aceita?',
    answer:
      'Você envia vídeos em MP4, MOV, WEBM, MKV ou AVI e baixa o áudio em MP3, WAV, M4A ou AAC. M4A e AAC precisam do modo híbrido.',
  },
  {
    question: 'Qual é o tamanho máximo do vídeo?',
    answer: `Cada vídeo pode ter até ${MAX_FILE_SIZE_LABEL}.`,
  },
  {
    question: 'Preciso criar uma conta?',
    answer:
      'Não. É só abrir o estúdio e começar. O histórico fica guardado apenas no navegador que você está usando.',
  },
  {
    question: 'Meu vídeo fica guardado em algum servidor?',
    answer:
      'Não. No modo local, o vídeo é processado no seu navegador. No modo híbrido, ele é enviado ao servidor de conversão quando necessário e apagado logo após o processamento.',
  },
  {
    question: 'Posso extrair o áudio de qualquer vídeo?',
    answer:
      'Extraia áudio apenas de conteúdos que você tem autorização para utilizar.',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  reducedMotion,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stepsRef = useRef<HTMLElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    const hero = heroRef.current
    const video = videoRef.current
    const steps = stepsRef.current
    if (!root || !hero || !video || !steps) return

    // A suavização só acompanha a rolagem da pessoa, sem movimento próprio.
    // Por isso ela desliga apenas com a opção "Reduzir animações" do app.
    const skipCountUp =
      reducedMotion ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const cleanups = [
      bindScrollScene({
        section: hero,
        video,
        holdEnd: HERO_HOLD_END,
        reducedMotion,
      }),
      bindScrollScene({ section: steps, reducedMotion }),
      waitForVideo(video, () => setIsReady(true)),
      primeVideoOnTouch(video),
      bindReveals(root, skipCountUp),
    ]
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [reducedMotion])

  return (
    <div
      ref={rootRef}
      className={`landing ${reducedMotion ? 'landing--calm' : ''}`}
    >
      <div
        className={`l-loader ${isReady ? 'is-done' : ''}`}
        role="status"
        aria-hidden={isReady}
      >
        <Capybara mood="tuning" size={88} still={reducedMotion} />
        <span>Afinando o estúdio</span>
      </div>

      <header className="l-nav">
        <a href="#inicio" aria-label="SONORA, voltar ao início">
          <Brand />
        </a>
        <nav aria-label="Seções da página" className="l-nav__links">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#privacidade">Privacidade</a>
          <a href="#perguntas">Perguntas</a>
        </nav>
        <button type="button" className="l-btn l-btn--small" onClick={onEnter}>
          Abrir estúdio
        </button>
      </header>

      <main>
        <section id="inicio" ref={heroRef} className="l-hero" aria-label="Apresentação">
          <div className="l-hero__stage">
            <video
              ref={videoRef}
              className="l-hero__video"
              src="/cinema/hero.mp4"
              poster="/cinema/poster.webp"
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            />
            <div className="l-hero__shade" aria-hidden="true" />

            <div className="l-hero__copy">
              <h1 className="l-title" data-capitulo="0-0.17">
                Todo vídeo
                <br />
                guarda um <em>som.</em>
              </h1>
              <p className="l-title" data-capitulo="0.2-0.38">
                Feche os
                <br />
                <em>olhos.</em>
              </p>
              <p className="l-title" data-capitulo="0.41-0.58">
                Escute o que a
                <br />
                imagem <em>escondia.</em>
              </p>
              <div className="l-hero__final" data-capitulo="0.8-1">
                <p className="l-title">
                  Do vídeo
                  <br />
                  ao <em>som.</em>
                </p>
                <button type="button" className="l-btn" onClick={onEnter}>
                  Converter agora
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="l-hero__cue" aria-hidden="true">
              Role para ouvir
              <ChevronDown />
            </p>

            <div className="l-hero__meter" aria-hidden="true">
              <span data-tempo>00:00</span>
              <div className="l-hero__track">
                <Wave bars={HERO_WAVE} className="l-wave--dim" />
                <Wave bars={HERO_WAVE} className="l-wave--lit" />
              </div>
              <span>00:10</span>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          ref={stepsRef}
          className="l-steps"
          aria-label="Como funciona"
        >
          <div className="l-steps__stage">
            <div className="l-steps__copy">
              <p className="l-eyebrow">Como funciona</p>
              <div className="l-steps__texts">
                <div data-capitulo="0-0.37">
                  <h2>Solte o vídeo.</h2>
                  <p>Arraste o arquivo para o estúdio ou escolha direto do seu dispositivo.</p>
                </div>
                <div data-capitulo="0.31-0.69">
                  <h2>Ajuste o som.</h2>
                  <p>Corte o trecho que importa, escolha o formato e deixe o volume no ponto.</p>
                </div>
                <div data-capitulo="0.63-1">
                  <h2>Baixe o áudio.</h2>
                  <p>Ouça o resultado, confira a forma de onda e leve o arquivo com você.</p>
                </div>
              </div>
            </div>

            <div className="l-window" aria-hidden="true">
              <div className="l-window__bar">
                <i />
                <i />
                <i />
                <span>Sonora Studio</span>
              </div>
              <div className="l-window__body">
                <div className="l-pane" data-capitulo="0-0.37">
                  <div className="l-drop">
                    <span className="l-drop__icon">
                      <Upload />
                    </span>
                    <strong>Arraste seu vídeo para cá</strong>
                    <small>MP4, MOV, WEBM, MKV, AVI · até {MAX_FILE_SIZE_LABEL}</small>
                  </div>
                </div>

                <div className="l-pane" data-capitulo="0.31-0.69">
                  <div className="l-file">
                    <strong>entrevista-completa.mp4</strong>
                    <small>Trecho selecionado</small>
                  </div>
                  <div className="l-trim">
                    <Wave bars={EDIT_WAVE} />
                    <span className="l-trim__range" />
                  </div>
                  <div className="l-chips">
                    <span className="is-active">MP3</span>
                    <span>WAV</span>
                    <span>M4A</span>
                    <span>AAC</span>
                  </div>
                </div>

                <div className="l-pane" data-capitulo="0.63-1">
                  <div className="l-result">
                    <Capybara mood="success" size={64} still={reducedMotion} />
                    <div>
                      <span className="l-badge">
                        <Check />
                        Pronto
                      </span>
                      <strong>Seu áudio está pronto.</strong>
                    </div>
                  </div>
                  <Wave bars={RESULT_WAVE} className="l-wave--player" />
                  <span className="l-fake-btn">
                    <Download />
                    Baixar áudio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="l-section">
          <div className="l-heading" data-revelar>
            <p className="l-eyebrow">Recursos</p>
            <h2>Um estúdio inteiro para a sua trilha.</h2>
          </div>

          <div className="l-bento" data-revelar-grupo>
            <article className="l-card l-card--wide">
              <h3>Corte no ponto exato</h3>
              <p>Escolha o início e o fim e baixe só a parte que você precisa.</p>
              <div className="l-card__art l-trim l-trim--loop" aria-hidden="true">
                <Wave bars={TRIM_WAVE} />
                <span className="l-trim__range" />
              </div>
            </article>

            <article className="l-card">
              <h3>4 formatos</h3>
              <p>MP3, WAV, M4A e AAC, com a qualidade que você escolher.</p>
              <div className="l-chips l-chips--cycle" aria-hidden="true">
                <span>MP3</span>
                <span>WAV</span>
                <span>M4A</span>
                <span>AAC</span>
              </div>
            </article>

            <article className="l-card">
              <h3>Volume de estúdio</h3>
              <p>Normalização em -16 LUFS para um som equilibrado.</p>
              <div className="l-meter" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <i key={index} style={{ animationDelay: `${index * -130}ms` }} />
                ))}
              </div>
            </article>

            <article className="l-card">
              <h3>Batidas no início</h3>
              <p>Adicione batidas antes da música começar, com um clique.</p>
              <div className="l-beats" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </article>

            <article className="l-card l-card--capy">
              <div>
                <h3>Uma guia no estúdio</h3>
                <p>A capivara acompanha cada etapa e reage ao que você faz.</p>
              </div>
              <Capybara mood="grooving" size={104} still={reducedMotion} />
            </article>
          </div>
        </section>

        <section id="privacidade" className="l-section l-privacy">
          <div className="l-heading" data-revelar>
            <p className="l-eyebrow">Privacidade</p>
            <h2>Seu vídeo não fica guardado no servidor.</h2>
          </div>

          <div className="l-privacy__grid" data-revelar-grupo>
            <article className="l-card">
              <HardDrive className="l-card__icon" aria-hidden="true" />
              <h3>Modo local</h3>
              <p>O vídeo é processado no seu navegador e não sai do dispositivo.</p>
            </article>
            <article className="l-card">
              <Server className="l-card__icon" aria-hidden="true" />
              <h3>Modo híbrido</h3>
              <p>Quando necessário, o vídeo vai ao servidor de conversão e é apagado logo após o processamento.</p>
            </article>
            <article className="l-card">
              <ShieldCheck className="l-card__icon" aria-hidden="true" />
              <h3>Histórico com você</h3>
              <p>Seu histórico de conversões fica apenas neste navegador.</p>
            </article>
          </div>
        </section>

        <section id="perguntas" className="l-section l-faq">
          <div className="l-heading" data-revelar>
            <p className="l-eyebrow">Perguntas frequentes</p>
            <h2>Antes de apertar o play.</h2>
          </div>
          <div className="l-faq__list" data-revelar-grupo>
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="l-final" data-revelar>
          <AudioWaveform className="l-final__icon" aria-hidden="true" />
          <h2>Seu próximo som já está no vídeo.</h2>
          <button type="button" className="l-btn" onClick={onEnter}>
            Abrir o estúdio
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="l-footer">
        <Brand />
        <p>Extraia áudio apenas de conteúdos que você possui autorização para utilizar.</p>
      </footer>
    </div>
  )
}
