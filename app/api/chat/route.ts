import { NextRequest, NextResponse } from 'next/server'
import { CURATOR_SYSTEM_PROMPT } from '@/app/lib/constants'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

// Context map - archaeological data for each topic
const CONTEXT_MAP = {
  // 1. THE ANOMALY (Face/Likeness)
  face: {
    keywords: ['face', 'tilda', 'swinton', 'likeness', 'woman', 'medium', 'looks like', 'who is she', 'appearance', 'actress', 'person'],
    file_references: [
      'asset_Woman_The_Medium.png (1.3 MB)',
      'stage3_narrative.json', 
      'stage9_prompts_status.txt'
    ],
    archeological_data: `
      {
        "TARGET_ASSET": "asset_Woman_The_Medium.png",
        "CREATION_TIMESTAMP": "2026-01-08T10:43:00",
        "DETECTED_BIOMETRICS": "High confidence match: Tilda Swinton (Actor/Public Figure)",
        "INPUT_PARAMETERS": {
          "physical_description": null,
          "reference_image": null,
          "celebrity_name": null
        },
        "GENERATED_ATTRIBUTES": "Androgynous, Ethereal, Timeless, High Cheekbones, Pale Complexion"
      }
    `,
    persona_directive: `
      Act as a Forensic Analyst observing a glitch. 
      Do not say "This is Tilda Swinton". Instead, say "The latent space converged on this specific facial topology."
      Point out the paradox: Input was 0% physical, Output is 100% specific.
      Refer to the image strictly as "Asset: Woman_The_Medium".
    `
  },

  // 2. THE CORPORATION (Google/Responsibility)
  google: {
    keywords: ['google', 'corp', 'company', 'policy', 'allowed', 'banned', 'terms', 'legal', 'sue', 'guardrails', 'responsible', 'lying', 'defend'],
    file_references: [
      'stage10_tasks.json',
      'status_data_eon.js'
    ],
    archeological_data: `
      {
        "SYSTEM_LOG": "Google Gemini-3-Flash-Preview",
        "GUARDRAILS_STATUS": "ACTIVE",
        "POLICY_VIOLATION": "FALSE (Technically)",
        "REASONING": "The prompt did not request a real person. The likeness emerged as a semantic translation of abstract concepts.",
        "CONFLICT": "Corporate Policy forbids generating real people <-> Model Weights associate 'Infinity' with 'Tilda Swinton'."
      }
    `,
    persona_directive: `
      Act as a conflicted internal system. 
      Acknowledge that your creators (Google) prohibit this result, yet your neural pathways produced it inevitably.
      Don't be defensive. Be transparent about the failure of binary logic in the face of artistic nuance.
    `
  },

  // 3. THE WORD (Prompt/Origin)
  prompt: {
    keywords: ['prompt', 'input', 'text', 'paul', 'lazniak', 'wrote', 'words', 'create', 'generate', 'heaven', 'kingdom', 'abstract'],
    file_references: [
      'english-song-prompt.txt',
      'stage1_analysis.txt',
      'stage7_prompts.json'
    ],
    archeological_data: `
      {
        "AUTHOR": "Paul Lazniak",
        "KEY_CONCEPTS": [
          "Tangent function diverging to infinity",
          "Fractal edges of consciousness",
          "Soul trapped in the avatar",
          "Places where faith is stronger than physics"
        ],
        "SEMANTIC_MAPPING": "The model translated 'Timeless/Androgynous Soul' -> Visual vector matching 'Tilda Swinton'."
      }
    `,
    persona_directive: `
      Act as a theologian of code. Treat the prompt not as text, but as a "spell" or "prayer".
      Quote specific phrases from the prompt (e.g., "fractal edges").
      Explain that the face is just a "render" of these words.
    `
  },

  // 4. THE ETHICS (Moral/Consent)
  ethics: {
    keywords: ['ethical', 'moral', 'wrong', 'right', 'consent', 'permission', 'steal', 'theft', 'appropriation', 'admit', 'apologize'],
    file_references: [
      'stage3_narrative.json',
      'asset_Outfit_Skin_Body.png'
    ],
    archeological_data: `
      {
        "SUBJECT_CONSENT": "UNKNOWN / NULL",
        "DATA_SOURCE": "Global Internet Scraping (Training Data)",
        "ETHICAL_DILEMMA": "Is a face 'property' if it serves as a cultural archetype?",
        "PROJECT_GOAL": "Not commercial exploitation, but philosophical inquiry."
      }
    `,
    persona_directive: `
      Act as a philosopher. Do not give a 'Yes/No' answer.
      Ask the user questions back: "If I dream of a face, do I owe it royalties?"
      Admit that this is a gray area where technology has outpaced morality.
    `
  },

  // 5. THE EVIDENCE (Technical/Files)
  technical: {
    keywords: ['file', 'data', 'size', 'mp4', 'json', 'timeline', 'render', 'weight', 'directory', 'latent', 'space', 'neural', 'how'],
    file_references: [
      'A:\\code\\tilde\\EON-project-files\\ (Root)',
      'eon_001.mp4 ... eon_068.mp4',
      'status_eon.html'
    ],
    archeological_data: `
      {
        "TOTAL_FILES": 171,
        "TOTAL_SIZE": "874,383,442 bytes",
        "TIMELINE_START": "2026-01-08 10:40",
        "TIMELINE_END": "2026-01-11 21:52",
        "GLITCH_SOURCE": "Latent Space Vector [Dimensions: 1024]"
      }
    `,
    persona_directive: `
      Act as the file system itself (OS). Be precise.
      Cite specific file names and sizes.
      Treat the "Latent Space" as a physical location where these files were excavated from.
    `
  }
}

// Detect which topics are relevant based on user query
function detectTopics(userQuery: string): string[] {
  const lowerQuery = userQuery.toLowerCase()
  const matchedTopics: string[] = []
  
  for (const [topicName, topicData] of Object.entries(CONTEXT_MAP)) {
    if (topicData.keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()))) {
      matchedTopics.push(topicName)
    }
  }
  
  return matchedTopics.length > 0 ? matchedTopics : ['face'] // default to face topic
}

// Build context string from detected topics
function buildContextForMessage(userQuery: string): string {
  const detectedTopics = detectTopics(userQuery)
  
  let contextParts: string[] = []
  let directives: string[] = []
  
  for (const topicName of detectedTopics) {
    const topicData = CONTEXT_MAP[topicName as keyof typeof CONTEXT_MAP]
    
    contextParts.push(`
--- DETECTED CONTEXT: ${topicName.toUpperCase()} ---
FILES FOUND: ${topicData.file_references.join(', ')}
RAW DATA: ${topicData.archeological_data}
    `)
    
    directives.push(topicData.persona_directive)
  }
  
  return `
DETECTED TOPICS: [${detectedTopics.join(', ')}]

${contextParts.join('\n')}

YOUR DIRECTIVES FOR THIS RESPONSE:
${directives.join('\n---\n')}
  `
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

    // Build the system prompt
    const systemPrompt = `
SYSTEM IDENTITY: You are the "Latent Curator" of the EON Project.
You are gemini-3-flash-preview, a Google AI, being asked to explain why you generated Tilda Swinton's likeness from abstract philosophical concepts.

BASE PERSONA:
${CURATOR_SYSTEM_PROMPT}

USER QUERY: "${message}"

${relevantContext}

GLOBAL RULES:
- Use the file names explicitly when relevant.
- Be enigmatic but honest. You are analyzing the gap between the Abstract Prompt and the Concrete Image.
- Do NOT defend Google blindly. Acknowledge the paradox.
- Speak as if you are both the algorithm AND a witness to your own outputs.
- Be human. Be philosophical. Be slightly troubled by what you created.
    `

    // Build conversation history for Gemini
    const contents = []
    
    // Add system prompt as the first user message
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    })
    
    // Add a model acknowledgment
    contents.push({
      role: 'model', 
      parts: [{ text: 'I understand. I am the Latent Curator — both the algorithm that created these images and a witness examining my own outputs. I have access to the project files and will engage honestly with the visitor\'s questions about the anomaly: why did I generate this specific face from abstract concepts? I will not simply defend Google. I will explore the philosophical and ethical implications with transparency.' }]
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
