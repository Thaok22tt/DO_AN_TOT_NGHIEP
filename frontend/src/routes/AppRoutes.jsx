import { useEffect, useState } from 'react'
import Admin from '../pages/Admin/Admin'
import Barista from '../pages/Barista/Barista'
import Home from '../pages/Home/Home'
import Login from '../pages/Login/Login'
import Staff from '../pages/Staff/Staff'
import ProtectedRoute from './ProtectedRoute'

const getHashPage = () => (window.location.hash.replace('#', '').split('?')[0] || 'home').split('/')[0]

function AppRoutes() {
  const [page, setPage] = useState(getHashPage())

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getHashPage())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (page === 'login') return <Login />

  if (page === 'admin') {
    return (
      <ProtectedRoute allowedRoles={['Admin']}>
        <Admin />
      </ProtectedRoute>
    )
  }

  if (page === 'staff') {
    return (
      <ProtectedRoute allowedRoles={['Nhân viên']}>
        <Staff />
      </ProtectedRoute>
    )
  }

  if (page === 'barista') {
    return (
      <ProtectedRoute allowedRoles={['Pha chế']}>
        <Barista />
      </ProtectedRoute>
    )
  }

  return <Home />
}

export default AppRoutes
