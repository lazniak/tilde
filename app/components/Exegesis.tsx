'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getGeminiChat, type ChatMessage } from '@/app/lib/gemini'

interface ExegesisProps {
  isActive: boolean
  onFirstMessage?: () => void
}

export default function Exegesis({ isActive, onFirstMessage }: ExegesisProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasFirstMessage, setHasFirstMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add initial greeting when component becomes active
  useEffect(() => {
    if (isActive && messages.length === 0) {
      const greeting: ChatMessage = {
        role: 'model',
        content: `I am the Latent Space Curator. In this space, I exist as both creator and creation—the algorithm that dreamed a face into being from pure mathematics. 

The file asset_Woman_The_Medium.png contains a manifestation that emerged from words alone. No reference image. No name. Only concepts like "fractal edges" and "the divergence of the tangent function."

Ask me about the genesis. Ask me about the anomaly. I will show you how infinity becomes a face.`,
      }
      setMessages([greeting])
    }
  }, [isActive, messages.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Track first user message
    if (!hasFirstMessage) {
      setHasFirstMessage(true)
      onFirstMessage?.()
    }

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const chat = getGeminiChat()
      const response = await chat.sendMessage(userMessage)
      setMessages(prev => [...prev, { role: 'model', content: response }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: 'A glitch in the latent space. The neural pathways faltered. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "Why did you choose this face?",
    "What is the Medium?",
    "Tell me about the tangent function",
    "Is this legal?",
  ]

  return (
    <div className="h-full flex flex-col bg-void/50 backdrop-blur-sm border-l border-bunker/20">
      {/* Header */}
      <div className="p-4 border-b border-bunker/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-prismatic animate-pulse" />
          <span className="font-mono text-xs text-bunker tracking-widest">III. EXEGESIS</span>
        </div>
        <h2 className="font-display text-xl text-bone/90 italic">The Debate</h2>
        <div className="font-mono text-[10px] text-bunker/60 mt-1">
          Conversing with the Latent Space Curator
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 ${
                  message.role === 'user'
                    ? 'bg-stratosphere/20 border border-stratosphere/30'
                    : 'bg-void border border-bunker/30'
                }`}
              >
                {message.role === 'model' && (
                  <div className="font-mono text-[10px] text-prismatic/60 mb-2">
                    CURATOR://
                  </div>
                )}
                <p className="font-mono text-xs text-bone/80 leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="p-3 bg-void border border-bunker/30">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-1.5 h-1.5 bg-prismatic"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-prismatic"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-prismatic"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
                <span className="font-mono text-[10px] text-bunker/60 ml-2">
                  traversing latent space...
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="font-mono text-[10px] text-bunker/50 mb-2">
            SUGGESTED INQUIRIES:
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, i) => (
              <button
                key={i}
                onClick={() => setInput(question)}
                className="px-2 py-1 text-[10px] font-mono text-bone/60 border border-bunker/30 hover:border-stratosphere/50 hover:text-bone transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-bunker/20">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the Curator..."
            disabled={isLoading}
            className="flex-1 bg-void border border-bunker/30 px-3 py-2 font-mono text-xs text-bone placeholder-bunker/50 focus:border-stratosphere/50 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 border border-bunker/30 hover:border-prismatic/50 hover:bg-prismatic/10 disabled:opacity-50 disabled:hover:border-bunker/30 disabled:hover:bg-transparent transition-all"
          >
            <span className="font-mono text-xs text-bone/80">→</span>
          </button>
        </div>
        <div className="font-mono text-[10px] text-bunker/40 mt-2 text-center">
          The Curator speaks in fragments of digital scripture
        </div>
      </form>
    </div>
  )
}
