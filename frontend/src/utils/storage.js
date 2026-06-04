export const getStorageItem = (key) => {
  return sessionStorage.getItem(key)
}

export const setStorageItem = (key, value) => {
  sessionStorage.setItem(key, value)
}

export const removeStorageItem = (key) => {
  sessionStorage.removeItem(key)
  localStorage.removeItem(key)
}

export const setAuthSession = ({ token, user }) => {
  if (!token) return

  const userValue = typeof user === 'string' ? user : JSON.stringify(user || {})

  sessionStorage.setItem('token', token)
  sessionStorage.setItem('user', userValue)
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const syncAuthSession = () => {
  const token = sessionStorage.getItem('token')
  const user = sessionStorage.getItem('user')

  localStorage.removeItem('token')
  localStorage.removeItem('user')

  return { token, user }
}

export const getStoredUser = () => {
  try {
    return JSON.parse(getStorageItem('user') || '{}')
  } catch {
    return {}
  }
}
