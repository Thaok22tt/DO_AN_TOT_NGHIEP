import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getMonthlyFinancialReport = ({ month, year }) =>
  request(`/financial/monthly?month=${month}&year=${year}`, {
    headers: getAuthHeaders(),
  })
