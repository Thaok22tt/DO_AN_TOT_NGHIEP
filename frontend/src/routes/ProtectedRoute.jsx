import PropTypes from 'prop-types'
import { getStoredUser, removeStorageItem, syncAuthSession } from '../utils/storage'

const getRoleRoute = (role = '') => {
  const normalizedRole = String(role).toLowerCase()

  if (normalizedRole === 'admin') return 'admin'
  if (normalizedRole.includes('pha')) return 'barista'
  return 'staff'
}

function ProtectedRoute({ allowedRoles = [], children }) {
  const { token } = syncAuthSession()
  const user = getStoredUser()

  if (!token) {
    window.location.hash = 'login'
    return null
  }

  if (!user.role) {
    removeStorageItem('token')
    removeStorageItem('user')
    window.location.hash = 'login'
    return null
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.hash = getRoleRoute(user.role)
    return null
  }

  return children
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
}

export default ProtectedRoute
