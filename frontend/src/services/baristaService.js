import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

const jsonRequest = (endpoint, options = {}) =>
  request(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

export const getBaristaOrders = ({ status = '' } = {}) => {
  const params = new URLSearchParams()

  if (status && status !== 'all') {
    params.set('status', status)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return jsonRequest(`/barista/orders${query}`)
}

export const getBaristaHistory = ({ startDate = '', endDate = '' } = {}) => {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const query = params.toString() ? `?${params.toString()}` : ''
  return jsonRequest(`/barista/history${query}`)
}

export const getBaristaWorkspace = () => jsonRequest('/barista/workspace')

export const getBaristaOrderById = (id) => jsonRequest(`/barista/orders/${id}`)

export const acceptBaristaOrder = (id) =>
  jsonRequest(`/barista/orders/${id}/accept`, {
    method: 'PATCH',
  })

export const updateBaristaOrderStatus = (id, status) =>
  jsonRequest(`/barista/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const completeBaristaOrder = (id) =>
  jsonRequest(`/barista/orders/${id}/complete`, {
    method: 'PATCH',
  })

export const rejectBaristaOrder = (id, payload) =>
  jsonRequest(`/barista/orders/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
