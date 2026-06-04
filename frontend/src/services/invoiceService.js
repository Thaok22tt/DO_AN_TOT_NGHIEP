import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getInvoices = ({ keyword = '', status = '', startDate = '', endDate = '' } = {}) => {
  const params = new URLSearchParams()

  if (keyword) {
    params.set('keyword', keyword)
  }

  if (status && status !== 'all') {
    params.set('status', status)
  }

  if (startDate) {
    params.set('startDate', startDate)
  }

  if (endDate) {
    params.set('endDate', endDate)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return request(`/invoices${query}`, {
    headers: getAuthHeaders(),
  })
}

export const getInvoiceById = (id) => {
  return request(`/invoices/${id}`, {
    headers: getAuthHeaders(),
  })
}
