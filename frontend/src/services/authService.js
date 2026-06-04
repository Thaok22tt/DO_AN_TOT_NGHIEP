import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const login = (credentials) => {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export const logout = () => {
  return request('/auth/logout', {
    method: 'POST',
    headers: getAuthHeaders(),
  })
}

export const getProfile = () => {
  return request('/auth/me', {
    headers: getAuthHeaders(),
  })
}

export const updateProfile = (profile) => {
  return request('/auth/me', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  })
}

export const changePassword = (payload) => {
  return request('/auth/change-password', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
}
