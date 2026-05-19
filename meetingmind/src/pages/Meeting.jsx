import { useState, useRef, useEffect } from 'react'
import pb from '../utils/pocketbase'

function Meeting({ navigate, user }) {
  const [phase, setPhase] = useState('setup')
  const [title, setTitle] = useState('')
  const [attendees, setAttendees] = useState('')
  const [transcript, setTranscript] = useState([])
  const [summary, setSummary] = useState('')
  const [actionItems, setActionItems] = useState([])
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [currentMeetingId, setCurrentMeetingId] = useState(null)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const durationRef = useRef(0)
  const transcriptRef = useRef([])

  useEffect(() => {
    checkBrowserSupport()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  const checkBrowserSupport = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setModelReady(true)
    } else {
      setError('Please use Google Chrome for speech recognition.')
    }
  }

  const startRecording = async () => {
    console.log('Start recording clicked')
    console.log('Title:', title)
    console.log('Model ready:', modelReady)
    console.log('Auth valid:', pb.authStore.isValid)
    if (!title.trim()) { setError('Please enter a meeting title first'); return }

    try {
      console.log('Creating meeting record...')
      const record = await pb.collection('mtg_meetings').create({
        title, attendees, status: 'recording',
        language: 'English + Swahili',
        user_id: pb.authStore.model.id
      })
      console.log('Meeting record created:', record.id)
      setCurrentMeetingId(record.id)

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.continuous = true
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.lang = 'en-US'

      let speakerIndex = 0

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim()
            if (!text) continue

            const newLine = {
              id: Date.now(),
              text,
              speaker: `SPEAKER ${(speakerIndex % 4) + 1}`,
              language: detectLanguage(text)
            }
            speakerIndex++

            transcriptRef.current = [...transcriptRef.current, newLine]
            setTranscript(prev => [...prev, newLine])
          }
        }
      }

      recognition.onerror = (e) => {
        if (e.error === 'no-speech') return
        console.error('Speech error:', e.error)
      }

      recognition.onend = () => {
        recognition.start()
      }

      recognition.start()
      setIsListening(true)
      setPhase('recording')
      setError('')

      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(d => d + 1)
      }, 1000)

    } catch (err) {
      console.error('Recording error:', err)
      console.error('Error details:', JSON.stringify(err))
      setError('Could not start recording: ' + err.message)
    }
  }

  const stopRecording = () => {
    setIsListening(false)
    if (recognitionRef.current) recognitionRef.current.stop()
    clearInterval(timerRef.current)
    generateSummary()
  }

  const detectLanguage = (text) => {
    const swahiliWords = ['na', 'ya', 'wa', 'kwa', 'ni', 'si', 'au', 'lakini', 'ndiyo', 'hapana', 'sawa', 'asante', 'habari', 'tutafanya', 'tunahitaji', 'nitafanya', 'hiyo', 'hii', 'leo']
    const words = text.toLowerCase().split(' ')
    const swahiliCount = words.filter(w => swahiliWords.includes(w)).length
    const ratio = swahiliCount / words.length
    if (ratio > 0.3) return 'SW'
    if (ratio > 0.1) return 'EN+SW'
    return 'EN'
  }

  const generateSummary = async () => {
    setPhase('processing')
    const fullText = transcriptRef.current.map(t => t.text).join(' ')

    if (!fullText.trim()) {
      setError('No speech detected. Please try again.')
      setPhase('setup')
      return
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are an expert meeting summarizer for African businesses.

Analyze this meeting transcript and return ONLY a JSON object:
{
  "summary": "2-3 sentence executive summary",
  "decisions": ["decision 1", "decision 2"],
  "action_items": [
    {"task": "what needs to be done", "owner": "who", "deadline": "when"}
  ],
  "follow_up": "next steps if mentioned"
}

Transcript:
${fullText}

Return only valid JSON, no markdown, no explanation.`
          }]
        })
      })

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      setSummary(parsed.summary || '')
      setActionItems(parsed.action_items || [])

      if (currentMeetingId) {
        await pb.collection('mtg_meetings').update(currentMeetingId, {
          transcript: transcriptRef.current.map(t => `[${t.language}] ${t.speaker}: ${t.text}`).join('\n'),
          summary: parsed.summary || '',
          action_items: JSON.stringify(parsed.action_items || []),
          status: 'completed',
          duration: durationRef.current
        })
      }

      setPhase('done')
    } catch (err) {
      console.error('Summary error:', err)
      setError('Summary generation failed. Transcript was saved.')
      setPhase('done')
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const langColor = (lang) => {
    if (lang === 'SW') return '#10b981'
    if (lang === 'EN+SW') return '#f59e0b'
    return '#00d4ff'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13' }}>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🎙️</span>
          <span style={{
            fontSize: '18px', fontWeight: '800',
            background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>MeetingMind</span>
        </div>
        <button onClick={() => navigate('dashboard')} style={{
          padding: '8px 16px', background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          color: '#a0a0b0', fontSize: '14px'
        }}>← Dashboard</button>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>

        {phase === 'setup' && (
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>New Meeting</h2>
            <p style={{ color: '#a0a0b0', marginBottom: '32px' }}>Fill in details then start recording</p>

            <div style={{
              background: modelReady ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${modelReady ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
              borderRadius: '12px', padding: '14px 18px', marginBottom: '24px',
              fontSize: '14px', color: modelReady ? '#10b981' : '#f59e0b'
            }}>
              {modelReady
                ? '✅ Ready — Chrome speech recognition active. English + Swahili supported.'
                : '❌ Please open this in Google Chrome'}
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                borderRadius: '10px', padding: '12px 16px',
                color: '#ff6b6b', marginBottom: '20px', fontSize: '14px'
              }}>{error}</div>
            )}

            <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>Meeting Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q2 Budget Review"
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', color: 'white', fontSize: '16px', marginBottom: '16px'
              }}
            />

            <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>Attendees (optional)</label>
            <input
              value={attendees} onChange={e => setAttendees(e.target.value)}
              placeholder="e.g. John, Mary, Peter"
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', color: 'white', fontSize: '16px', marginBottom: '32px'
              }}
            />

            <button
              onClick={startRecording}
              disabled={!modelReady}
              style={{
                width: '100%', padding: '18px', fontSize: '18px', fontWeight: '700',
                background: modelReady ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '14px', color: 'white',
                cursor: modelReady ? 'pointer' : 'not-allowed'
              }}
            >
              🔴 Start Recording
            </button>
          </div>
        )}

        {phase === 'recording' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '64px', fontWeight: '800', color: '#ef4444' }}>
                {formatTime(duration)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                RECORDING — {title}
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '20px', minHeight: '200px',
              maxHeight: '350px', overflowY: 'auto', marginBottom: '24px'
            }}>
              <div style={{ fontSize: '13px', color: '#a0a0b0', marginBottom: '12px' }}>📝 Live Transcript</div>
              {transcript.length === 0 ? (
                <p style={{ color: '#555', fontSize: '14px' }}>Listening... speak clearly into your microphone</p>
              ) : (
                transcript.map(line => (
                  <div key={line.id} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                        background: `${langColor(line.language)}20`,
                        color: langColor(line.language), fontWeight: '600'
                      }}>{line.language}</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>{line.speaker}</span>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#e0e0e0' }}>{line.text}</p>
                  </div>
                ))
              )}
            </div>

            <button onClick={stopRecording} style={{
              width: '100%', padding: '18px', fontSize: '18px', fontWeight: '700',
              background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '14px', color: 'white'
            }}>⏹ Stop & Generate Summary</button>
          </div>
        )}

        {phase === 'processing' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🧠</div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Generating Summary...</h3>
            <p style={{ color: '#a0a0b0' }}>AI is analyzing your meeting transcript</p>
          </div>
        )}

        {phase === 'done' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <span style={{ fontSize: '32px' }}>✅</span>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>{title}</h2>
                <p style={{ color: '#a0a0b0', fontSize: '14px' }}>Duration: {formatTime(duration)} · Language: English + Swahili</p>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
                borderRadius: '10px', padding: '12px 16px',
                color: '#ff6b6b', marginBottom: '20px', fontSize: '14px'
              }}>{error}</div>
            )}

            {summary && (
              <div style={{
                background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '16px', padding: '24px', marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#00d4ff', marginBottom: '12px' }}>📋 Executive Summary</h3>
                <p style={{ lineHeight: 1.7, color: '#e0e0e0' }}>{summary}</p>
              </div>
            )}

            {actionItems.length > 0 && (
              <div style={{
                background: 'rgba(123,47,247,0.05)', border: '1px solid rgba(123,47,247,0.2)',
                borderRadius: '16px', padding: '24px', marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#7b2ff7', marginBottom: '16px' }}>✅ Action Items</h3>
                {actionItems.map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                    padding: '14px', marginBottom: '10px'
                  }}>
                    <p style={{ fontWeight: '600', marginBottom: '6px' }}>{item.task}</p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {item.owner && <span style={{ fontSize: '13px', color: '#a0a0b0' }}>👤 {item.owner}</span>}
                      {item.deadline && <span style={{ fontSize: '13px', color: '#a0a0b0' }}>📅 {item.deadline}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '24px', marginBottom: '24px',
              maxHeight: '300px', overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>📝 Full Transcript</h3>
              {transcript.map(line => (
                <div key={line.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                      background: `${langColor(line.language)}20`,
                      color: langColor(line.language), fontWeight: '600'
                    }}>{line.language}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>{line.speaker}</span>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{line.text}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('dashboard')} style={{
                flex: 1, padding: '14px',
                background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
                border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '15px'
              }}>Back to Dashboard</button>
              <button onClick={() => {
                setPhase('setup'); setTranscript([]); setSummary('')
                setActionItems([]); setDuration(0); setTitle('')
                setAttendees(''); durationRef.current = 0
                transcriptRef.current = []
              }} style={{
                flex: 1, padding: '14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '15px'
              }}>New Meeting</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

export default Meeting