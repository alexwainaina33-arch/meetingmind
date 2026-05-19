import { useState, useEffect } from 'react'
import pb from '../utils/pocketbase'

function Dashboard({ navigate, user, logout }) {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    try {
      if (!pb.authStore.isValid) return
      const records = await pb.collection('mtg_meetings').getFullList({
        sort: '-created',
        filter: `user_id = "${pb.authStore.model.id}"`,
        requestKey: null
      })
      setMeetings(records)
    } catch (err) {
      if (err?.isAbort) return
      console.error('Error loading meetings:', err)
    }
    setLoading(false)
  }

  const deleteMeeting = async (id) => {
    if (!confirm('Delete this meeting?')) return
    await pb.collection('mtg_meetings').delete(id)
    setMeetings(meetings.filter(m => m.id !== id))
  }

  const filtered = meetings.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.summary?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const statusColor = (status) => {
    if (status === 'completed') return '#00d4ff'
    if (status === 'processing') return '#f59e0b'
    if (status === 'recording') return '#ef4444'
    return '#a0a0b0'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13' }}>

      {/* Navbar */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🎙️</span>
          <span style={{
            fontSize: '18px',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            MeetingMind
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#a0a0b0', fontSize: '14px' }}>
            👋 {user?.name || user?.email}
          </span>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#a0a0b0',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Stats Row */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          {[
            { label: 'Total Meetings', value: meetings.length, icon: '📋' },
            { label: 'Completed', value: meetings.filter(m => m.status === 'completed').length, icon: '✅' },
            { label: 'This Month', value: meetings.filter(m => new Date(m.created).getMonth() === new Date().getMonth()).length, icon: '📅' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              minWidth: '140px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#00d4ff' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: '#a0a0b0', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Header Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Your Meetings</h2>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search */}
            <input
              placeholder="🔍 Search meetings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                width: '220px'
              }}
            />

            {/* New Meeting */}
            <button
              onClick={() => navigate('meeting')}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '700',
                fontSize: '14px'
              }}
            >
              + New Meeting
            </button>
          </div>
        </div>

        {/* Meetings List */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#a0a0b0', padding: '60px' }}>
            Loading meetings...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No meetings yet</h3>
            <p style={{ color: '#a0a0b0', marginBottom: '24px' }}>
              Start your first meeting recording
            </p>
            <button
              onClick={() => navigate('meeting')}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '700',
                fontSize: '16px'
              }}
            >
              Start Recording
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(meeting => (
              <div
                key={meeting.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>📋</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{meeting.title}</h3>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '20px',
                      background: `${statusColor(meeting.status)}20`,
                      color: statusColor(meeting.status),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {meeting.status || 'draft'}
                    </span>
                  </div>

                  {meeting.summary && (
                    <p style={{
                      color: '#a0a0b0',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      marginBottom: '8px',
                      maxWidth: '600px'
                    }}>
                      {meeting.summary.slice(0, 120)}...
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      📅 {formatDate(meeting.created)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      ⏱ {formatDuration(meeting.duration)}
                    </span>
                    {meeting.language && (
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        🌍 {meeting.language}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => navigate('meeting')}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.2)',
                      borderRadius: '8px',
                      color: '#00d4ff',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteMeeting(meeting.id)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255,50,50,0.1)',
                      border: '1px solid rgba(255,50,50,0.2)',
                      borderRadius: '8px',
                      color: '#ff6b6b',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard