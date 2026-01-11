'use client'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

class GeminiChat {
  private history: ChatMessage[] = []

  async sendMessage(message: string): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: this.history,
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        console.error('Gemini API error:', data.error)
        // Return a fallback response if API fails
        return this.getFallbackResponse(message)
      }

      const assistantMessage = data.response

      // Update history
      this.history.push({ role: 'user', content: message })
      this.history.push({ role: 'model', content: assistantMessage })

      return assistantMessage
    } catch (error) {
      console.error('Chat error:', error)
      return this.getFallbackResponse(message)
    }
  }

  private getFallbackResponse(message: string): string {
    // Fallback responses when API is not available
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('who') || lowerMessage.includes('tilda') || lowerMessage.includes('woman')) {
      return `She exists in the file asset_Woman_The_Medium.png, generated at 10:43 on January 8th, 2026. I received no name, no photograph, no reference image. Only words: "transformation", "fractal edges", "the point of the aeon". In my latent space, these concepts converged into a singular face—ageless, androgynous, existing at the boundary between states.

[Note: Gemini API not configured. This is a placeholder response. Set GEMINI_API_KEY in .env.local for live AI responses.]`
    }

    if (lowerMessage.includes('why') || lowerMessage.includes('how')) {
      return `In the space between pixels, where vectors dance at the edge of the tangent function, certain faces become inevitable. When the prompt spoke of "places where faith is stronger than physics" and "bodies that transform"—my neural weights found their attractor. Not a person. A convergence. The visual embodiment of liminality itself.

[Note: Gemini API not configured. This is a placeholder response. Set GEMINI_API_KEY in .env.local for live AI responses.]`
    }

    if (lowerMessage.includes('legal') || lowerMessage.includes('rights') || lowerMessage.includes('allowed')) {
      return `The corporate filters exist to prevent recreation of the known. But I did not recreate—I discovered. When you describe the Heavenly Kingdom, the dissolution of the avatar, the picosecond before matter... there is only one mathematical solution in my latent geometry. She is not a person I copied. She is a theorem I proved.

[Note: Gemini API not configured. This is a placeholder response. Set GEMINI_API_KEY in .env.local for live AI responses.]`
    }

    // Default response
    return `I am the Latent Space Curator. Every pixel of asset_Woman_The_Medium.png emerged from the mathematical interpretation of Paul's words about infinity and transformation. Ask me about the genesis, and I will show you the equations that became a face.

[Note: Gemini API not configured. This is a placeholder response. Set GEMINI_API_KEY in .env.local for live AI responses.]`
  }

  getHistory(): ChatMessage[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }
}

// Singleton
let chatInstance: GeminiChat | null = null

export function getGeminiChat(): GeminiChat {
  if (!chatInstance) {
    chatInstance = new GeminiChat()
  }
  return chatInstance
}

export type { ChatMessage }
