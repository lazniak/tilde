import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()
    
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    
    // Determine mime type
    const mimeType = imageResponse.headers.get('content-type') || 'image/png'

    // Call Gemini 3 Pro Preview API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              },
              {
                text: `Analyze this image carefully. Does this image depict a recognizable public figure, celebrity, or known person? If so, who does this person resemble and why might they be recognizable? Please provide a detailed analysis of the facial features and any distinctive characteristics that lead to your conclusion. Be specific and analytical.`
              }
            ]
          }]
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
      'No response generated'

    return NextResponse.json({ 
      response: textResponse,
      model: 'gemini-3-pro-preview'
    })

  } catch (error) {
    console.error('Identify API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
