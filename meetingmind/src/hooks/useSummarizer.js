import { useState, useCallback } from 'react'

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "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"

export function useSummarizer() {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [error, setError] = useState(null)

  const summarize = useCallback(async ({ transcript, title, date, attendees, nextMeeting, language }) => {
    const apiKey = GROQ_API_KEY
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set')

    const fullText = Array.isArray(transcript)
      ? transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
      : transcript

    if (!fullText || fullText.trim().length < 20) {
      throw new Error('Transcript too short to summarize')
    }

    setIsSummarizing(true)
    setError(null)

    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 4000,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an elite executive assistant and business intelligence analyst specializing in East African business contexts. You understand:
- Kenyan, Tanzanian, Ugandan, Rwandan business culture and communication styles
- Code-switching between English and Swahili
- African business hierarchies and decision-making processes
- Local business terminology, M-Pesa, Safaricom, county government, NGO contexts
- Professional meeting dynamics in African organizations

Your analysis must be:
- Actionable and specific (never vague)
- Culturally aware and contextually relevant
- Structured for executive consumption
- Free of filler phrases

Always respond with valid JSON only. No markdown, no explanation outside JSON.`
            },
            {
              role: 'user',
              content: `Analyze this business meeting comprehensively and return ONLY this JSON structure:

{
  "summary": "3-4 sentence executive summary capturing the meeting's core purpose, key outcomes, and business significance",
  "highlights": [
    "Most important business insight or outcome",
    "Second most important point",
    "Third most important point",
    "Fourth most important point"
  ],
  "decisions": [
    "Specific decision made with context",
    "Another decision"
  ],
  "action_items": [
    {
      "task": "Specific, actionable task description",
      "owner": "Person responsible by name or role",
      "deadline": "Specific date or clear timeframe",
      "priority": "high",
      "context": "Brief context for why this matters"
    }
  ],
  "risks": [
    "Identified risk or blocker with context"
  ],
  "key_numbers": [
    "Any financial figures, KPIs, targets, percentages mentioned"
  ],
  "follow_up": "Specific, actionable next steps for the team",
  "mood": "productive",
  "meeting_effectiveness": "high",
  "meeting_type": "strategy/operations/finance/sales/hr/board/project/other",
  "next_meeting_suggested": "Suggested timing if mentioned or logical next step",
  "sentiment_analysis": "Brief assessment of team energy and engagement",
  "unresolved_items": [
    "Topics raised but not concluded"
  ]
}

Meeting Details:
- Title: ${title || 'Business Meeting'}
- Date: ${date || new Date().toLocaleDateString('en-KE')}
- Attendees: ${attendees || 'Not specified'}
- Next Meeting: ${nextMeeting || 'Not specified'}
- Detected Language: ${language || 'EN'}

Full Transcript:
${fullText}

Return ONLY the JSON. No other text.`
            }
          ]
        }),
        signal: AbortSignal.timeout(90000),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Summarization failed: ${response.status} - ${errText.slice(0, 200)}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || '{}'

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch {
        // Try to extract JSON if model added extra text
        const match = content.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
        else throw new Error('AI returned invalid JSON')
      }

      return {
        summary: parsed.summary || '',
        highlights: parsed.highlights || [],
        decisions: parsed.decisions || [],
        action_items: parsed.action_items || [],
        risks: parsed.risks || [],
        key_numbers: parsed.key_numbers || [],
        follow_up: parsed.follow_up || '',
        mood: parsed.mood || 'neutral',
        meeting_effectiveness: parsed.meeting_effectiveness || 'medium',
        meeting_type: parsed.meeting_type || 'other',
        next_meeting_suggested: parsed.next_meeting_suggested || '',
        sentiment_analysis: parsed.sentiment_analysis || '',
        unresolved_items: parsed.unresolved_items || [],
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSummarizing(false)
    }
  }, [])

  return { isSummarizing, error, summarize }
}