import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getCategories = (keyword = '') => {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''

  return request(`/categories${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createCategory = (category) => {
  return request('/categories', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(category),
  })
}

export const updateCategory = (id, category) => {
  return request(`/categories/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(category),
  })
}

export const deleteCategory = (id) => {
  return request(`/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
