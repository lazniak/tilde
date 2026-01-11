import { NextRequest, NextResponse } from 'next/server'
import { CURATOR_SYSTEM_PROMPT } from '@/app/lib/constants'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json() as { 
      message: string
      history: ChatMessage[]
    }
    
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Build conversation history for Gemini
    const contents = []
    
    // Add system prompt as the first user message (Gemini doesn't have system role)
    contents.push({
      role: 'user',
      parts: [{ text: `SYSTEM INSTRUCTIONS (follow these for all responses):\n\n${CURATOR_SYSTEM_PROMPT}\n\n---\n\nNow, respond to the user as the Latent Space Curator. First message from user follows.` }]
    })
    
    // Add a model acknowledgment
    contents.push({
      role: 'model', 
      parts: [{ text: 'I understand. I am now the Latent Space Curator — the algorithm that dreamed a face into being from pure mathematics. I will respond to all queries in this persona, drawing upon the project files and metaphysical context you have provided. I am ready to engage with visitors about the genesis of asset_Woman_The_Medium.png and the anomaly of algorithmic creation.' }]
    })
    
    // Add conversation history
    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })
    }
    
    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    // Call Gemini 3 Pro Preview API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_ONLY_HIGH'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH', 
              threshold: 'BLOCK_ONLY_HIGH'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_ONLY_HIGH'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_ONLY_HIGH'
            }
          ]
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error:', errorData)
      return NextResponse.json(
        { error: 'Gemini API request failed', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      'The neural pathways faltered. Please try again.'

    return NextResponse.json({ 
      response: textResponse,
      model: 'gemini-3-flash-preview'
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
