import type { NextApiRequest, NextApiResponse } from 'next'

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

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const requestBody = {
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
              text: `Extract job order information from this image and respond with ONLY this JSON format, no markdown:
{
  "jobNumber": "JOB-XXXXX or similar",
  "location": "full address",
  "serviceLine": "service type",
  "urgency": "Normal|High|Emergency",
  "scope": "work description",
  "jobRequirements": ["requirement1", "requirement2"],
  "techRate": 41,
  "helperRate": 21,
  "tripCharge": 30,
  "nte": 0,
  "dmgContact": "contact info"
}`,
            },
          ],
        },
      ],
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Claude API error:', error)
      return res.status(response.status).json({
        error: `Claude API error: ${response.statusText}`,
      })
    }

    const data = await response.json()
    const message = data.content[0]

    if (!message || message.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response format' })
    }

    // Parse the JSON response
    let extractedData: ExtractedData
    try {
      extractedData = JSON.parse(message.text)
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = message.text.match(/\{[\s\S]*\}/)
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
