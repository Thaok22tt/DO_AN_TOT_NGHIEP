import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getAreas = (keyword = '') => {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''

  return request(`/areas${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createArea = (area) => {
  return request('/areas', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(area),
  })
}

export const updateArea = (id, area) => {
  return request(`/areas/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(area),
  })
}

export const deleteArea = (id) => {
  return request(`/areas/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
