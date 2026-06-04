import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getAccounts = () => {
  return request('/accounts', {
    headers: getAuthHeaders(),
  })
}

export const getRoles = () => {
  return request('/accounts/roles', {
    headers: getAuthHeaders(),
  })
}

export const createAccount = (account) => {
  return request('/accounts', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(account),
  })
}

export const updateAccount = (id, account) => {
  return request(`/accounts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(account),
  })
}

export const updateAccountRole = (id, roleId) => {
  return request(`/accounts/${id}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ roleId }),
  })
}

export const updateAccountStatus = (id, status) => {
  return request(`/accounts/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
}

export const resetAccountPassword = (id, password) => {
  return request(`/accounts/${id}/password`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password }),
  })
}

export const deleteAccount = (id) => {
  return request(`/accounts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
