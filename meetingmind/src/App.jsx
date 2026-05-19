import { useState, useEffect } from 'react'
import pb from './utils/pocketbase'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Meeting from './pages/Meeting'
import Login from './pages/Login'

function App() {
  const [page, setPage] = useState('landing')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model?.collectionName === 'mm_users') {
      setUser(pb.authStore.model)
      setPage('dashboard')
    }
  }, [])

  const navigate = (newPage) => setPage(newPage)

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setPage('landing')
  }

  return (
    <div>
      {page === 'landing' && <Landing navigate={navigate} />}
      {page === 'login' && <Login navigate={navigate} setUser={setUser} />}
      {page === 'dashboard' && <Dashboard navigate={navigate} user={user} logout={logout} />}
      {page === 'meeting' && <Meeting navigate={navigate} user={user} />}
    </div>
  )
}

export default App