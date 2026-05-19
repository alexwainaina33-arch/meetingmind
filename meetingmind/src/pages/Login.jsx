import { useState } from 'react'
import pb from '../utils/pocketbase'

function Login({ navigate, setUser }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (isSignup) {
        await pb.collection('mm_users').create({
          email,
          password,
          passwordConfirm: password,
          name,
          company,
        })
        const auth = await pb.collection('mm_users').authWithPassword(email, password)
        setUser(auth.record)
        navigate('dashboard')
      } else {
        const auth = await pb.collection('mm_users').authWithPassword(email, password)
        setUser(auth.record)
        navigate('dashboard')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '16px',
    marginBottom: '12px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f13 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎙️</div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: '#a0a0b0', marginTop: '8px' }}>
            {isSignup ? 'Start your free trial today' : 'Sign in to MeetingMind Africa'}
          </p>
        </div>

        {isSignup && (
          <>
            <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>Full Name</label>
            <input style={inputStyle} placeholder="John Kamau" value={name} onChange={e => setName(e.target.value)} />
            <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>Company</label>
            <input style={inputStyle} placeholder="Acme Ltd" value={company} onChange={e => setCompany(e.target.value)} />
          </>
        )}

        <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>Email</label>
        <input style={inputStyle} placeholder="john@company.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />

        <label style={{ fontSize: '13px', color: '#a0a0b0', display: 'block', marginBottom: '6px' }}>Password</label>
        <input style={inputStyle} placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />

        {error && (
          <div style={{
            background: 'rgba(255,50,50,0.1)',
            border: '1px solid rgba(255,50,50,0.3)',
            borderRadius: '10px',
            padding: '12px',
            color: '#ff6b6b',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '700',
            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '20px'
          }}
        >
          {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', color: '#a0a0b0', fontSize: '14px' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => { setIsSignup(!isSignup); setError('') }}
            style={{ color: '#00d4ff', cursor: 'pointer', fontWeight: '600' }}
          >
            {isSignup ? 'Sign In' : 'Sign Up Free'}
          </span>
        </p>

        <p onClick={() => navigate('landing')} style={{
          textAlign: 'center', color: '#555', fontSize: '13px', marginTop: '16px', cursor: 'pointer'
        }}>
          ← Back to home
        </p>
      </div>
    </div>
  )
}

export default Login