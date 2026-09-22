import type { NextApiRequest, NextApiResponse } from 'next'
import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ExtractedData {
  jobNumber: string
  location: string
  serviceLine: string
  urgency: string
  scope: string
  jobRequirements: string[]
  techRate: number
  helperRate: number
  tripCharge: number
  nte?: number
  dmgContact?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExtractedData | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { imageBase64, mimeType } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' })
    }

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Extract the following information from this work order image and return as JSON:
{
  "jobNumber": "job number/ID",
  "location": "job location address",
  "serviceLine": "service line or service type",
  "urgency": "urgency level (Normal, High, Emergency)",
  "scope": "scope of work description",
  "jobRequirements": ["array", "of", "requirements"],
  "techRate": number (technician hourly rate),
  "helperRate": number (helper hourly rate),
  "tripCharge": number (trip charge amount),
  "nte": number (not-to-exceed amount if present),
  "dmgContact": "contact name or email"
}

Return ONLY valid JSON, no markdown or extra text.`,
            },
          ],
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response format' })
    }

    // Parse the JSON response
    let extractedData: ExtractedData
    try {
      extractedData = JSON.parse(content.text)
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return res.status(500).json({ error: 'Failed to parse extracted data' })
      }
      extractedData = JSON.parse(jsonMatch[0])
    }

    // Ensure numeric fields are numbers
    extractedData.techRate = Number(extractedData.techRate) || 41
    extractedData.helperRate = Number(extractedData.helperRate) || 21
    extractedData.tripCharge = Number(extractedData.tripCharge) || 30

    res.status(200).json(extractedData)
  } catch (error) {
    console.error('Extraction error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract data from image',
    })
  }
}
