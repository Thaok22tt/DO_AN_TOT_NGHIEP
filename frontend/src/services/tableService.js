import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getTables = ({ keyword = '', areaId = 0 } = {}) => {
  const params = new URLSearchParams()

  if (keyword) {
    params.set('keyword', keyword)
  }

  if (areaId) {
    params.set('areaId', areaId)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return request(`/tables${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createTable = (table) => {
  return request('/tables', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(table),
  })
}

export const updateTable = (id, table) => {
  return request(`/tables/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(table),
  })
}

export const deleteTable = (id) => {
  return request(`/tables/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
