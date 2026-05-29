import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import pb from '../utils/pocketbase'

export const useMeetingStore = create(
  persist(
    (set, get) => ({
      // Current meeting
      currentMeetingId: null,
      title: '',
      meetingDate: new Date().toISOString().split('T')[0],
      attendees: '',
      nextMeetingDate: '',
      language: 'auto',

      // Recording state
      phase: 'setup', // setup | recording | processing | done | error
      chunks: [],
      transcript: [],
      duration: 0,

      // Results
      summary: '',
      highlights: [],
      decisions: [],
      actionItems: [],
      risks: [],
      keyNumbers: [],
      followUp: '',
      mood: 'neutral',
      effectiveness: 'medium',
      meetingType: 'other',
      nextMeetingSuggested: '',
      sentimentAnalysis: '',
      unresolvedItems: [],

      // UI state
      error: null,
      processingStep: '',

      // Actions
      setField: (key, value) => set({ [key]: value }),

      setPhase: (phase, processingStep = '') => set({ phase, processingStep }),

      addTranscriptChunk: (chunk) => set(state => ({
        transcript: [...state.transcript, chunk]
      })),

      updateTranscriptLine: (id, newText) => set(state => ({
        transcript: state.transcript.map(l =>
          l.id === id ? { ...l, text: newText, edited: true } : l
        )
      })),

      setSummaryResults: (results) => set({
        summary: results.summary || '',
        highlights: results.highlights || [],
        decisions: results.decisions || [],
        actionItems: results.action_items || [],
        risks: results.risks || [],
        keyNumbers: results.key_numbers || [],
        followUp: results.follow_up || '',
        mood: results.mood || 'neutral',
        effectiveness: results.meeting_effectiveness || 'medium',
        meetingType: results.meeting_type || 'other',
        nextMeetingSuggested: results.next_meeting_suggested || '',
        sentimentAnalysis: results.sentiment_analysis || '',
        unresolvedItems: results.unresolved_items || [],
      }),

      setCurrentMeetingId: (id) => set({ currentMeetingId: id }),

      setError: (error) => set({ error, phase: 'error' }),

      reset: () => set({
        currentMeetingId: null,
        title: '',
        meetingDate: new Date().toISOString().split('T')[0],
        attendees: '',
        nextMeetingDate: '',
        language: 'auto',
        phase: 'setup',
        chunks: [],
        transcript: [],
        duration: 0,
        summary: '',
        highlights: [],
        decisions: [],
        actionItems: [],
        risks: [],
        keyNumbers: [],
        followUp: '',
        mood: 'neutral',
        effectiveness: 'medium',
        meetingType: 'other',
        nextMeetingSuggested: '',
        sentimentAnalysis: '',
        unresolvedItems: [],
        error: null,
        processingStep: '',
      }),

      // Save draft to PocketBase
      saveDraft: async () => {
        const state = get()
        try {
          const data = {
            title: state.title || 'Untitled Meeting',
            transcript: state.transcript.map(t => `[${t.language}] ${t.speaker}: ${t.text}`).join('\n'),
            summary: state.summary,
            action_items: JSON.stringify(state.actionItems),
            status: state.phase === 'done' ? 'completed' : 'processing',
            duration: state.duration,
            language: state.language,
            attendees: state.attendees,
          }

          if (state.currentMeetingId) {
            await pb.collection('mtg_meetings').update(state.currentMeetingId, data)
          } else {
            const record = await pb.collection('mtg_meetings').create({
              ...data,
              user_id: pb.authStore.model?.id,
            })
            set({ currentMeetingId: record.id })
            return record.id
          }
        } catch (err) {
          console.error('Save draft failed:', err)
        }
      },
    }),
    {
      name: 'meetingmind-current-meeting',
      partialize: (state) => ({
        title: state.title,
        meetingDate: state.meetingDate,
        attendees: state.attendees,
        language: state.language,
      }),
    }
  )
)