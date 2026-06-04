import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getPromotions = (keyword = '') => {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''

  return request(`/promotions${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createPromotion = (promotion) => {
  return request('/promotions', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(promotion),
  })
}

export const updatePromotion = (id, promotion) => {
  return request(`/promotions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(promotion),
  })
}

export const deletePromotion = (id) => {
  return request(`/promotions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
