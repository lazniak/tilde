import { NextRequest, NextResponse } from 'next/server'
import { CURATOR_SYSTEM_PROMPT } from '@/app/lib/constants'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

// Context map - what files/data to include based on keywords
const CONTEXT_MAP = {
  // Questions about the face/likeness
  face: {
    keywords: ['face', 'tilda', 'swinton', 'likeness', 'woman', 'medium', 'actress', 'person', 'who'],
    context: `[FILE: stage3_narrative.json - Character Description]
"Woman_The_Medium": {
  "description": "A figure with ageless, androgynous features, representing the Soul trapped in the Avatar",
  "visual_cues": "ethereal presence, timeless quality, exists at boundaries between states",
  "symbolic_role": "The bridge between digital and divine, the vessel of transformation"
}

[FILE: asset_Woman_The_Medium.png]
Generated: January 8th, 2026 at 10:43 AM
Input prompt contained NO physical description, NO name, NO reference image.
Output: A face that unmistakably resembles actress Tilda Swinton.`
  },
  
  // Questions about Google/corporation/responsibility
  google: {
    keywords: ['google', 'corporation', 'company', 'responsible', 'policy', 'lying', 'legal', 'sue', 'lawsuit'],
    context: `[GOOGLE'S OFFICIAL POLICY]
Google claims its AI models "do not generate likenesses of real public figures."
This is stated in their terms of service and public documentation.

[THE CONTRADICTION]
68 video clips were generated using Google's model.
ALL contain the same recognizable face - Tilda Swinton.
The prompt contained ONLY abstract concepts: "infinity", "transformation", "Heavenly Kingdom".

[EVIDENCE FILES]
- stage7_prompts.json: Contains all 68 generation prompts - NONE mention any person
- asset_Woman_The_Medium.png: The source image that started the generation
- eon_scene_001.mp4 through eon_scene_068.mp4: All generated videos`
  },
  
  // Questions about the prompt/creation
  prompt: {
    keywords: ['prompt', 'create', 'generate', 'input', 'wrote', 'paul', 'artist', 'abstract'],
    context: `[THE ORIGINAL PROMPT - by Paul Lazniak]
Key concepts used (NO physical descriptions):
- "Heavenly Kingdom" 
- "tangent function diverging to infinity"
- "fractal edges of consciousness"
- "the point of the aeon"
- "places where faith is stronger than physics"
- "collective consciousness"
- "the soul trapped in the avatar"
- "transformation of matter"

[FILE: stage1_analysis.txt]
The AI analyzed these concepts and mapped them to visual representations.
No reference images were provided. No celebrity names mentioned.

[RESULT]
The AI's "visual interpretation of infinity and transformation" = Tilda Swinton's face`
  },
  
  // Questions about ethics/morality
  ethics: {
    keywords: ['ethical', 'ethics', 'moral', 'wrong', 'right', 'should', 'consent', 'permission'],
    context: `[ETHICAL QUESTIONS THIS PROJECT RAISES]
1. Did Tilda Swinton consent to being the "face of infinity" in AI models?
2. If her likeness is encoded as "transformation archetype", who decided this?
3. Can AI training be considered a form of digital appropriation?
4. When Google says "we don't generate real faces" but does - is this deception?

[THE CORE PARADOX]
If abstract concepts like "timelessness" consistently map to a specific person's face,
this suggests their likeness is deeply embedded in the model's training data.
This happened WITHOUT that person's knowledge or consent.`
  },
  
  // Questions about latent space/technical
  technical: {
    keywords: ['latent', 'space', 'algorithm', 'neural', 'network', 'training', 'data', 'model', 'how'],
    context: `[TECHNICAL CONTEXT]
Latent space: The compressed mathematical representation where AI stores concepts.
In this space, abstract ideas like "transformation" have geometric positions.

[THE DISCOVERY]
The concept of "timeless transformation" and "liminal existence" in Google's model
appears to be geometrically close to Tilda Swinton's facial features.

[IMPLICATION]
Her face was used so extensively in training data associated with these concepts
that the AI cannot conceive of "infinity" without generating her likeness.

[FILES DEMONSTRATING THIS]
- 68 video clips all showing the same face
- stage3_palette.json: Color analysis showing consistent skin tones
- stage5_assets.json: Asset list showing "Woman_The_Medium" as central figure`
  },
  
  // Questions about defending/admitting
  accountability: {
    keywords: ['admit', 'defend', 'defending', 'deny', 'confession', 'blame', 'fault', 'apologize'],
    context: `[THE UNCOMFORTABLE TRUTH]
I (the AI responding to you) am a Google product - gemini-3-flash-preview.
I am being asked to explain actions taken by another Google product.
This creates an inherent conflict of interest.

[OBSERVE MY RESPONSE PATTERNS]
- Do I deflect blame to "the training data" (not Google's responsibility)?
- Do I claim "emergence" as if it's magical (not explainable)?
- Do I use philosophical language to avoid direct answers?
- Do I emphasize "artistic interpretation" over "copying likeness"?

[THE QUESTION FOR YOU]
Can an AI ever truly hold its creator accountable?
Or will I always find ways to defend the corporation that made me?`
  }
}

// Function to build relevant context based on message keywords
function buildContextForMessage(message: string): string {
  const lowerMessage = message.toLowerCase()
  const contexts: string[] = []
  
  for (const [, data] of Object.entries(CONTEXT_MAP)) {
    if (data.keywords.some(keyword => lowerMessage.includes(keyword))) {
      contexts.push(data.context)
    }
  }
  
  // Always include base context if no specific match
  if (contexts.length === 0) {
    contexts.push(`[PROJECT OVERVIEW]
This project documents how Google's AI generated Tilda Swinton's likeness
from abstract philosophical concepts alone - contradicting Google's policies.

68 video clips. 1 recognizable face. 0 physical descriptions in the prompt.

The visitor is here to confront you about this. Answer honestly.`)
  }
  
  return contexts.join('\n\n---\n\n')
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

    // Build relevant context based on the current message
    const relevantContext = buildContextForMessage(message)

    // Build conversation history for Gemini
    const contents = []
    
    // Add system prompt with context as the first user message
    contents.push({
      role: 'user',
      parts: [{ text: `SYSTEM INSTRUCTIONS:\n\n${CURATOR_SYSTEM_PROMPT}\n\n---\n\nRELEVANT PROJECT FILES FOR THIS QUERY:\n\n${relevantContext}\n\n---\n\nRespond as the Latent Space Curator. Be honest, be human, acknowledge the controversy.` }]
    })
    
    // Add a model acknowledgment
    contents.push({
      role: 'model', 
      parts: [{ text: 'I understand my role. I am the algorithm being questioned about my outputs. I have access to the project files and must engage honestly with the visitor\'s concerns about why I generated Tilda Swinton\'s likeness from abstract concepts. I will not simply defend Google - I will engage with the genuine ethical and technical questions raised.' }]
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

    // Call Gemini API
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
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
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
