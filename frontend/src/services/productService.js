import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

const buildProductFormData = (product) => {
  const formData = new FormData()

  formData.append('name', product.name)
  formData.append('categoryId', product.categoryId)
  formData.append('price', product.price)
  formData.append('description', product.description || '')
  formData.append('status', product.status)

  if (product.image instanceof File) {
    formData.append('image', product.image)
  }

  return formData
}

export const getProducts = ({ keyword = '', categoryId = '' } = {}) => {
  const params = new URLSearchParams()

  if (keyword) {
    params.set('keyword', keyword)
  }

  if (categoryId) {
    params.set('categoryId', categoryId)
  }

  const query = params.toString() ? `?${params.toString()}` : ''

  return request(`/products${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createProduct = (product) => {
  return request('/products', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: buildProductFormData(product),
  })
}

export const updateProduct = (id, product) => {
  return request(`/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: buildProductFormData(product),
  })
}

export const deleteProduct = (id) => {
  return request(`/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
