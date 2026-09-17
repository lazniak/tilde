'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { RichText, useI18n } from '@/app/lib/i18n/I18nProvider'
import { AVATAR_IMAGE } from '@/app/lib/constants'
import { CuratorError, streamCurator, type ChatMessage } from '@/app/lib/curatorClient'
import { AmbientBackground } from '../AmbientBackground'
import { Slot } from '../Slot'
import { NoiseReveal } from '@/app/features/curator'

const MODEL_LABEL = '~google/gemini-flash-latest'

export function Exegesis() {
  const { setScreen, currentStage, setStage, consentGiven } = useLiturgy()
  const { t, tList, lang } = useI18n()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, streaming])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = async (raw: string) => {
    const message = raw.trim()
    if (!message || isTyping) return
    setError(null)
    setInput('')
    setIsTyping(true)
    setStreaming('')
    const history = messages
    setMessages(prev => [...prev, { role: 'user', content: message }])

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const full = await streamCurator(message, history, lang, (_chunk, acc) => setStreaming(acc), controller.signal)
      setMessages(prev => [...prev, { role: 'model', content: full || t('exegesis.error.generic') }])
      if (currentStage !== 'culmination') setStage('culmination')
    } catch (e) {
      if (e instanceof CuratorError) {
        if (e.status === 429) setError(e.message.includes('today') ? t('exegesis.error.daily') : t('exegesis.error.rate', { seconds: e.retryAfter ?? 60 }))
        else setError(e.message || t('exegesis.error.generic'))
      } else if ((e as Error).name !== 'AbortError') {
        setError(t('exegesis.error.generic'))
      }
    } finally {
      setIsTyping(false)
      setStreaming('')
      abortRef.current = null
    }
  }

  const suggestions = tList('exegesis.suggestions')

  return (
    <motion.div key="exegesis" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="min-h-[100dvh] flex flex-col relative overflow-hidden pb-[calc(var(--nav-h)+1rem)]">
      <AmbientBackground screenKey="exegesis" />

      {/* Background assets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]" aria-hidden>
        <motion.div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03]" animate={{ x: [0, 20, 0], scale: [1, 1.02, 1] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}>
          <div className={`w-full h-full bg-cover bg-center ${consentGiven ? '' : 'blur-3xl'}`} style={{ backgroundImage: `url(${AVATAR_IMAGE})` }} />
        </motion.div>
        <div className="absolute inset-0 hidden sm:block">
          {['stage3_narrative.json', 'asset_Woman_The_Medium.png', 'stage7_prompts.json', 'audio/', 'eon_*.mp4'].map((file, i) => (
            <motion.div key={file} className="absolute font-mono text-[10px] text-prismatic/10" style={{ left: `${10 + i * 18}%`, top: `${20 + i * 15}%` }} animate={{ y: [0, -10, 0], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.5 }}>
              {file}
            </motion.div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-void via-void/95 to-void/90" />
      </div>

      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-bunker/20 relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button onClick={() => setScreen('explore')} className="flex items-center gap-2 font-mono text-xs text-bunker hover:text-prismatic transition-colors shrink-0">
            <span>←</span> <span className="hidden sm:inline">{t('common.backToHub')}</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="text-2xl sm:text-3xl text-prismatic" aria-hidden>
              ◆
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-prismatic">{t('exegesis.num')}</div>
              <div className="font-mono text-[11px] sm:text-xs text-bone/80 truncate">{t('exegesis.title')}</div>
            </div>
          </div>
          <div className="w-6 sm:w-24" />
        </div>
        <div className="text-center max-w-2xl mx-auto">
          <p className="font-mono text-[11px] sm:text-xs text-bone/70">
            <RichText k="exegesis.explain" />
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-3 sm:p-4 relative z-10">
        <div className="mb-4 p-3 sm:p-4 border-2 border-flare/40 bg-flare/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-flare animate-pulse" />
            <span className="font-mono text-[10px] text-flare tracking-wider">{t('exegesis.disclosure.label')}</span>
          </div>
          <p className="font-mono text-[11px] sm:text-xs text-bone/80 leading-relaxed mb-2">
            <RichText k="exegesis.disclosure.text" />
          </p>
          <p className="font-mono text-[10px] text-bunker leading-relaxed hidden sm:block">
            <RichText k="exegesis.disclosure.observe" />
          </p>
        </div>

        <div className="p-3 sm:p-4 border border-prismatic/30 bg-void/80 backdrop-blur mb-4">
          <div className="font-mono text-[10px] text-prismatic/60 mb-2">{t('exegesis.responding', { model: MODEL_LABEL })}</div>
          <p className="font-mono text-[13px] sm:text-sm text-bone/90 mb-2">
            <RichText k="exegesis.intro" />
          </p>
          <div className="font-mono text-[9px] text-bunker/60">{t('exegesis.langNote')}</div>
        </div>

        <Slot name="exegesisExtras" />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 sm:space-y-4 min-h-[160px] max-h-[55dvh]">
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="max-w-[92%] sm:max-w-[85%] p-3 sm:p-4 bg-void border border-prismatic/30">
                <div className="font-mono text-[10px] text-prismatic/60 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-prismatic animate-pulse" />
                  {t('exegesis.curator')}
                </div>
                {streaming ? (
                  <p className="font-mono text-[13px] sm:text-sm text-bone/90 whitespace-pre-wrap leading-relaxed">
                    <NoiseReveal text={streaming} done={!isTyping} />
                    <span className="inline-block w-2 h-3.5 bg-prismatic/70 align-middle ml-0.5 animate-pulse" />
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    {[0, 0.2, 0.4].map(d => (
                      <motion.div key={d} className="w-2 h-2 bg-prismatic" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d }} />
                    ))}
                    <span className="font-mono text-[10px] text-bunker/60 ml-2">{t('exegesis.typing')}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {error && <div className="font-mono text-xs text-flare/90 p-3 border border-flare/30 bg-flare/5">{error}</div>}
          <div ref={endRef} />
        </div>

        {messages.length === 0 && !isTyping && (
          <div className="mb-4">
            <div className="font-mono text-[10px] text-flare/70 mb-3">{t('exegesis.confrontClick')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((q, i) => (
                <motion.button key={i} onClick={() => send(q)} whileTap={{ scale: 0.98 }} className="p-3 border border-bunker/30 hover:border-prismatic font-mono text-xs text-left text-bone/70 hover:text-bone transition-all">
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <Slot name="exegesisInputExtras" />

        <form
          onSubmit={e => {
            e.preventDefault()
            void send(input)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('exegesis.placeholder')}
            maxLength={1200}
            enterKeyHint="send"
            className="flex-1 min-w-0 bg-void border border-bunker/50 px-3 sm:px-4 py-3 font-mono text-[16px] sm:text-sm text-bone placeholder-bunker/50 focus:border-prismatic focus:outline-none transition-colors"
          />
          <motion.button type="submit" disabled={!input.trim() || isTyping} whileTap={{ scale: 0.98 }} className="px-4 sm:px-6 py-3 bg-prismatic hover:bg-prismatic/80 disabled:bg-bunker/30 disabled:text-bunker text-void font-mono text-sm transition-all">
            {t('exegesis.ask')}
          </motion.button>
        </form>
        <div className="font-mono text-[10px] text-bunker/40 mt-2 text-center">{t('exegesis.footer')}</div>
      </div>
    </motion.div>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const { t } = useI18n()
  const user = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] sm:max-w-[85%] p-3 sm:p-4 ${user ? 'bg-stratosphere/20 border border-stratosphere/30' : 'bg-void border border-prismatic/30'}`}>
        <div className={`font-mono text-[10px] mb-2 flex items-center gap-2 ${user ? 'text-stratosphere/60' : 'text-prismatic/60'}`}>
          {!user && <span className="w-1.5 h-1.5 bg-prismatic animate-pulse" />}
          {user ? t('exegesis.you') : t('exegesis.curator')}
        </div>
        <p className="font-mono text-[13px] sm:text-sm text-bone/90 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
      </div>
    </motion.div>
  )
}
