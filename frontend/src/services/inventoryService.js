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

export const getInventoryBootstrap = () => jsonRequest('/inventory/bootstrap')

export const createIngredientCategory = (payload) =>
  jsonRequest('/inventory/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateIngredientCategory = (id, payload) =>
  jsonRequest(`/inventory/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteIngredientCategory = (id) =>
  jsonRequest(`/inventory/categories/${id}`, {
    method: 'DELETE',
  })

export const createSupplier = (payload) =>
  jsonRequest('/inventory/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateSupplier = (id, payload) =>
  jsonRequest(`/inventory/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const createIngredient = (payload) =>
  jsonRequest('/inventory/ingredients', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateIngredient = (id, payload) =>
  jsonRequest(`/inventory/ingredients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const adjustIngredientStock = (id, payload) =>
  jsonRequest(`/inventory/ingredients/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const createStockReceipt = (payload) =>
  jsonRequest('/inventory/receipts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const replaceProductRecipe = (productId, payload) =>
  jsonRequest(`/inventory/recipes/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
