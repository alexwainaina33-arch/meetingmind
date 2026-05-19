function Landing({ navigate }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>

      <h1 style={{
        fontSize: '48px',
        fontWeight: '800',
        background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '16px',
        lineHeight: 1.2
      }}>
        MeetingMind Africa
      </h1>

      <p style={{
        fontSize: '20px',
        color: '#a0a0b0',
        maxWidth: '600px',
        marginBottom: '12px',
        lineHeight: 1.6
      }}>
        Record your meetings in English, Swahili or both.
        Get instant transcripts, summaries and action items.
      </p>

      <p style={{ fontSize: '16px', color: '#00d4ff', marginBottom: '48px' }}>
        Built for African businesses. Works offline. Privacy first.
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('login')}
          style={{
            padding: '16px 40px',
            fontSize: '18px',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            border: 'none',
            borderRadius: '12px',
            color: 'white'
          }}
        >
          Get Started Free
        </button>

        <button
          onClick={() => navigate('login')}
          style={{
            padding: '16px 40px',
            fontSize: '18px',
            fontWeight: '700',
            background: 'transparent',
            border: '2px solid #7b2ff7',
            borderRadius: '12px',
            color: 'white'
          }}
        >
          Sign In
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '24px',
        marginTop: '80px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {[
          { icon: '🌍', title: 'English + Swahili', desc: 'Understands code-switching naturally' },
          { icon: '🔒', title: 'Privacy First', desc: 'Audio never leaves your device' },
          { icon: '⚡', title: 'Instant Summary', desc: 'Action items in seconds' },
          { icon: '📱', title: 'Web + Mobile', desc: 'Works everywhere' },
        ].map((f, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
            width: '160px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{f.icon}</div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>{f.title}</div>
            <div style={{ fontSize: '13px', color: '#a0a0b0' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Landing