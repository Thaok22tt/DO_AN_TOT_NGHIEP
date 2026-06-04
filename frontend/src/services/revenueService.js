import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

const getRevenue = (endpoint, params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''

  return request(`/revenue/${endpoint}${query}`, {
    headers: getAuthHeaders(),
  })
}

export const getDailyRevenue = (date) => getRevenue('daily', { date })

export const getMonthlyRevenue = ({ month, year }) => getRevenue('monthly', { month, year })

export const getYearlyRevenue = (year) => getRevenue('yearly', { year })

export const getYearsRevenue = ({ endYear, startYear }) => getRevenue('years', { endYear, startYear })

export const getRangeRevenue = ({ startDate, endDate }) => getRevenue('range', { startDate, endDate })
