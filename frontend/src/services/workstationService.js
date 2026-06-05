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

export const getWorkstationBootstrap = () => jsonRequest('/workstation/bootstrap')

export const getMyWorkstationInvoices = (params = {}) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return jsonRequest(`/workstation/my-invoices${query}`)
}

export const getWorkstationInvoices = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return jsonRequest(`/workstation/invoices${query}`)
}

export const getWorkstationInvoiceById = (id) => jsonRequest(`/workstation/invoices/${id}`)

export const createWorkstationInvoice = (payload) =>
  jsonRequest('/workstation/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const addWorkstationInvoiceItem = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateWorkstationInvoiceDetailQuantity = (detailId, payload) =>
  jsonRequest(`/workstation/invoice-details/${detailId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const updateWorkstationInvoiceDetailNote = (detailId, payload) =>
  jsonRequest(`/workstation/invoice-details/${detailId}/note`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const updateWorkstationInvoiceDetailSize = (detailId, payload) =>
  jsonRequest(`/workstation/invoice-details/${detailId}/size`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteWorkstationInvoiceDetail = (detailId) =>
  jsonRequest(`/workstation/invoice-details/${detailId}`, {
    method: 'DELETE',
  })

export const updateWorkstationInvoiceNote = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/note`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const sendWorkstationInvoiceToKitchen = (id) =>
  jsonRequest(`/workstation/invoices/${id}/send`, {
    method: 'PATCH',
  })

export const updateWorkstationInvoiceStatus = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const updateWorkstationTableStatus = (id, payload) =>
  jsonRequest(`/workstation/tables/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const applyWorkstationPromotion = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/promotion`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const updateWorkstationPaymentMethod = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/payment-method`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const confirmWorkstationPayment = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const completeWorkstationInvoice = (id) =>
  jsonRequest(`/workstation/invoices/${id}/complete`, {
    method: 'POST',
  })

export const transferWorkstationInvoiceTable = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/transfer-table`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const mergeWorkstationInvoices = (id, payload) =>
  jsonRequest(`/workstation/invoices/${id}/merge`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const markWorkstationInvoiceServed = (id) =>
  jsonRequest(`/workstation/invoices/${id}/served`, {
    method: 'POST',
  })

export const startWorkstationDelivery = (id) =>
  jsonRequest(`/workstation/invoices/${id}/start-delivery`, {
    method: 'PATCH',
  })

export const completeWorkstationDelivery = (id, { amountReceived } = {}) =>
  jsonRequest(`/workstation/invoices/${id}/complete-delivery`, {
    method: 'PATCH',
    body: JSON.stringify({ amountReceived }),
  })
