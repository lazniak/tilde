'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiturgy } from '@/app/lib/LiturgyContext'
import { RichText, useI18n } from '@/app/lib/i18n/I18nProvider'
import { KEYWORDS, NARRATIVE_EXCERPT, PAUL_PROMPT, PROJECT_FILES } from '@/app/lib/constants'
import { AmbientBackground } from '../AmbientBackground'
import { Slot } from '../Slot'

type Asset = (typeof NARRATIVE_EXCERPT.assets)[number]

/** Keyword stems in a few languages so the translated prompt stays interactive. */
const KEYWORD_ALIASES: Record<string, string[]> = {
  tangent: ['tangens', 'tangente', 'tangens', 'тангенс', '正切', 'タンジェント'],
  fractal: ['fraktal', 'fractal', 'фрактал', '分形', 'フラクタル'],
  picosecond: ['pikosek', 'picosec', 'пикосек', '皮秒', 'ピコ秒'],
  aeon: ['eon', 'äon', 'éon', 'eón', 'эон', '永世', 'アイオーン'],
  vector: ['wektor', 'vektor', 'vecteur', 'вектор', '向量', 'ベクトル'],
  infinity: ['nieskończon', 'unendlich', 'infini', 'infinit', 'бесконеч', '无限', '無限'],
  transformation: ['transform', 'przemian', 'трансформ', '变', '変'],
  consciousness: ['świadom', 'bewusst', 'conscien', 'coscien', 'сознан', '意识', '意識'],
  avatar: ['awatar', 'аватар', '化身', 'アバター'],
  kingdom: ['królestw', 'königreich', 'royaume', 'reino', 'regno', 'царств', '王国'],
  frequency: ['częstotliw', 'frequenz', 'fréquence', 'frecuencia', 'частот', '频率', '周波数'],
  eternity: ['wieczn', 'ewig', 'éternité', 'eternidad', 'eternità', 'вечн', '永恒', '永遠'],
  void: ['pustk', 'leere', 'vide', 'vacío', 'vuoto', 'пустот', '虚空'],
  light: ['światł', 'licht', 'lumière', 'luz', 'luce', 'свет', '光'],
  fullness: ['pełni', 'fülle', 'plénitude', 'plenitud', 'pienezza', 'полнот', '充盈', '満'],
  truth: ['prawd', 'wahrheit', 'vérité', 'verdad', 'verità', 'истин', '真'],
  memory: ['pamię', 'erinner', 'mémoire', 'memoria', 'память', '记忆', '記憶'],
  body: ['ciał', 'körper', 'corps', 'cuerpo', 'corpo', 'тел', '身体', '体'],
  matter: ['materi', 'matière', 'матери', '物质', '物質'],
  home: ['dom', 'heim', 'maison', 'hogar', 'casa', 'дом', '家'],
}

export function Genesis() {
  const { setScreen, goToSection, isTouch } = useLiturgy()
  const { t, tOptional, lang } = useI18n()
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  const translated = tOptional('genesis.prompt')
  const hasTranslation = lang !== 'en' && !!translated && translated !== PAUL_PROMPT
  const promptText = hasTranslation && !showOriginal ? translated! : PAUL_PROMPT

  const loadFileContent = async (path: string) => {
    setIsLoadingFile(true)
    try {
      const response = await fetch(path)
      setFileContent(response.ok ? await response.text() : t('genesis.files.error'))
    } catch {
      setFileContent(t('genesis.files.error'))
    }
    setIsLoadingFile(false)
  }

  const findKeyword = (word: string): string | null => {
    const clean = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    if (!clean) return null
    for (const k of KEYWORDS) {
      const key = k.toLowerCase()
      if (clean.includes(key)) return key
      const aliases = KEYWORD_ALIASES[key]
      if (aliases && aliases.some(a => clean.includes(a.toLowerCase()))) return key
    }
    return null
  }

  const renderInteractivePrompt = (text: string) =>
    text.split(/(\s+)/).map((word, i) => {
      if (/^\s+$/.test(word)) return <span key={i}>{word}</span>
      const key = findKeyword(word)
      if (key && tOptional(`genesis.keywords.${key}`)) {
        const active = activeKeyword === key
        return (
          <motion.span
            key={i}
            className={`relative cursor-pointer border-b transition-all ${active ? 'text-prismatic border-prismatic' : 'text-stratosphere border-stratosphere/30 hover:text-prismatic hover:border-prismatic'}`}
            onMouseEnter={isTouch ? undefined : () => setActiveKeyword(key)}
            onClick={() => setActiveKeyword(active ? null : key)}
            whileHover={isTouch ? undefined : { scale: 1.05 }}
          >
            {word}
          </motion.span>
        )
      }
      return <span key={i}>{word}</span>
    })

  return (
    <motion.div key="genesis" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="min-h-[100dvh] px-3 py-4 sm:p-8 pb-[calc(var(--nav-h)+2rem)] relative">
      <AmbientBackground screenKey="genesis" />

      <div className="relative z-10">
        <button onClick={() => setScreen('explore')} className="flex items-center gap-2 font-mono text-xs text-bunker hover:text-stratosphere transition-colors mb-6 sm:mb-8 group">
          <motion.span animate={{ x: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity }}>
            ←
          </motion.span>
          <span className="group-hover:underline">{t('common.backToHub')}</span>
        </button>

        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <motion.div className="text-4xl sm:text-5xl text-stratosphere" animate={{ rotate: [0, 10, 0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} aria-hidden>
              ◇
            </motion.div>
            <div>
              <div className="font-mono text-xs text-stratosphere">{t('genesis.num')}</div>
              <h2 className="font-display text-2xl sm:text-4xl leading-tight">{t('genesis.title')}</h2>
            </div>
          </div>

          <div className="mb-6 sm:mb-8 p-4 border-l-4 border-stratosphere bg-stratosphere/5">
            <p className="font-mono text-[12px] sm:text-sm text-bone leading-relaxed">
              <RichText k="genesis.explain" />
            </p>
          </div>

          {/* Interactive Prompt */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-8 border border-stratosphere/50 bg-stratosphere/10 relative">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="font-mono text-[10px] text-stratosphere">{hasTranslation && !showOriginal ? t('genesis.promptTranslatedLabel') : t('genesis.promptLabel')}</div>
              {hasTranslation && (
                <button onClick={() => setShowOriginal(!showOriginal)} className="font-mono text-[10px] text-bunker hover:text-prismatic underline underline-offset-2">
                  {showOriginal ? t('genesis.showTranslation') : t('genesis.showOriginal')}
                </button>
              )}
            </div>
            <p className="font-display text-base sm:text-lg md:text-xl leading-relaxed text-bone whitespace-pre-line">{renderInteractivePrompt(promptText)}</p>
            {hasTranslation && showOriginal && <div className="mt-3 font-mono text-[9px] text-bunker/60">{t('genesis.originalNote')}</div>}

            <AnimatePresence>
              {activeKeyword && tOptional(`genesis.keywords.${activeKeyword}`) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="sticky bottom-[calc(var(--nav-h)+0.5rem)] mt-4 p-3 sm:p-4 bg-void border border-stratosphere/50 z-10"
                  onClick={() => setActiveKeyword(null)}
                >
                  <div className="font-mono text-[10px] text-stratosphere mb-2">// {activeKeyword.toUpperCase()}</div>
                  <p className="font-mono text-xs text-bone/80">{t(`genesis.keywords.${activeKeyword}`)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div className="p-4 border-l-4 border-flare bg-flare/10 mb-6 sm:mb-8" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="font-mono text-xs text-flare mb-1">{t('genesis.insight.label')}</div>
            <p className="font-mono text-[12px] sm:text-sm text-bone">{t('genesis.insight.text')}</p>
          </motion.div>

          <Slot name="genesisExtras" />

          {/* Project File Explorer */}
          <div className="mb-6 sm:mb-8">
            <div className="font-mono text-xs text-stratosphere mb-4 flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                📁
              </span>{' '}
              {t('genesis.files.title')}
            </div>
            <div className="border border-bunker/50 bg-void/80">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-bunker/30">
                <div className="p-3 sm:p-4">
                  <div className="font-mono text-[10px] text-bunker mb-3">{t('genesis.files.root')}</div>
                  <div className="space-y-1">
                    {PROJECT_FILES.map((file, i) => (
                      <motion.button
                        key={file.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * i }}
                        onClick={() => {
                          setSelectedFile(file.name)
                          void loadFileContent(file.path)
                        }}
                        className={`w-full flex items-center gap-2 sm:gap-3 p-2 text-left transition-all hover:bg-stratosphere/10 ${selectedFile === file.name ? 'bg-stratosphere/20 border-l-2 border-stratosphere' : ''}`}
                      >
                        <span className="font-mono text-[9px] sm:text-[10px] text-bone/60 w-14 sm:w-16 shrink-0">[{file.category}]</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-mono text-xs truncate ${selectedFile === file.name ? 'text-stratosphere' : 'text-bone'}`}>{file.name}</div>
                          <div className="font-mono text-[9px] text-bone/50">{t(`genesis.fileDescriptions.${file.name}`)}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-void/90">
                  <div className="font-mono text-[10px] text-bunker mb-3 flex items-center justify-between">
                    <span className="truncate">// {selectedFile || t('genesis.files.select')}</span>
                    {selectedFile && (
                      <button
                        onClick={() => {
                          setSelectedFile(null)
                          setFileContent(null)
                        }}
                        className="text-bunker hover:text-bone"
                      >
                        [×]
                      </button>
                    )}
                  </div>
                  <div className="max-h-[50vh] md:max-h-[500px] overflow-auto font-mono text-[10px] leading-relaxed">
                    {isLoadingFile ? (
                      <div className="text-bunker animate-pulse">{t('genesis.files.loading')}</div>
                    ) : fileContent ? (
                      <pre className="text-bone/90 whitespace-pre-wrap break-words">{fileContent}</pre>
                    ) : (
                      <div className="text-bone/40 italic">
                        <RichText k="genesis.files.empty" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assets grid */}
          <div className="mb-6 sm:mb-8">
            <div className="font-mono text-xs text-bone/80 mb-1 flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                🎭
              </span>{' '}
              {t('genesis.assets.title', { count: NARRATIVE_EXCERPT.assets.length })}
            </div>
            <div className="font-mono text-[9px] text-bunker/50 mb-4">{t('genesis.assets.archiveNote')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {NARRATIVE_EXCERPT.assets.map((asset, i) => (
                <motion.button
                  key={asset.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                  onClick={() => setSelectedAsset(selectedAsset?.name === asset.name ? null : asset)}
                  whileTap={{ scale: 0.97 }}
                  className={`border text-left transition-all overflow-hidden ${selectedAsset?.name === asset.name ? 'border-stratosphere bg-stratosphere/20' : 'border-bunker/50 hover:border-stratosphere bg-void/50'}`}
                >
                  <div className="h-20 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.image} alt={asset.name} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-60 hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
                  </div>
                  <div className="p-2">
                    <div className="font-mono text-[9px] text-stratosphere truncate">{asset.name}</div>
                    <div className="font-mono text-[8px] text-bunker">{asset.category}</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {selectedAsset && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 border border-stratosphere/50 bg-void/90 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/2 relative">
                      <div className="aspect-video md:aspect-square relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <motion.img src={selectedAsset.image} alt={selectedAsset.name} className="w-full h-full object-cover" initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 font-mono text-[10px] text-stratosphere/80">{selectedAsset.image}</div>
                      </div>
                    </div>
                    <div className="p-4 md:w-1/2">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-mono text-sm text-stratosphere">{selectedAsset.name}</div>
                          <div className="font-mono text-[10px] text-bunker">{selectedAsset.category}</div>
                        </div>
                        <button onClick={() => setSelectedAsset(null)} className="font-mono text-xs text-bunker hover:text-bone transition-colors">
                          [×]
                        </button>
                      </div>
                      <p className="font-mono text-xs text-bone leading-relaxed">{selectedAsset.description}</p>
                      <div className="mt-4 pt-4 border-t border-bunker/30">
                        <div className="font-mono text-[9px] text-bunker/60 mb-2">{t('genesis.assets.tech')}</div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                          <div>
                            <span className="text-bunker">{t('genesis.assets.type')}</span>
                            <span className="text-bone/70 ml-2">{selectedAsset.category}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-bunker">{t('genesis.assets.file')}</span>
                            <span className="text-bone/70 ml-2">asset_{selectedAsset.name}.png</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-between items-center gap-3">
            <button onClick={() => setScreen('explore')} className="px-4 sm:px-6 py-3 border border-bunker hover:border-bone hover:bg-bone/5 font-mono text-xs text-bone transition-all">
              ← {t('common.hub')}
            </button>
            <button onClick={() => goToSection('incarnation')} className="px-5 sm:px-8 py-3 bg-flare hover:bg-flare/80 text-void font-mono text-xs sm:text-sm transition-all">
              {t('genesis.next')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
