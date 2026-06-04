import request from './api'

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token')

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getEmployees = (keyword = '') => {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''

  return request(`/employees${query}`, {
    headers: getAuthHeaders(),
  })
}

export const getAssignableEmployeeAccounts = (employeeId) => {
  const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ''

  return request(`/employees/assignable-accounts${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createEmployee = (employee) => {
  return request('/employees', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(employee),
  })
}

export const updateEmployee = (id, employee) => {
  return request(`/employees/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(employee),
  })
}

export const updateEmployeeAccountStatus = (id, status) => {
  return request(`/employees/${id}/account-status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
}

export const deleteEmployee = (id) => {
  return request(`/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}

export const getAttendance = ({ startDate = '', endDate = '' } = {}) => {
  const params = new URLSearchParams()

  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)

  const query = params.toString() ? `?${params.toString()}` : ''

  return request(`/employees/attendance${query}`, {
    headers: getAuthHeaders(),
  })
}

export const getPayroll = (month = '') => {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''

  return request(`/employees/payroll${query}`, {
    headers: getAuthHeaders(),
  })
}

export const updatePayrollPayment = (employeeId, { month, status }) => {
  return request(`/employees/payroll/${employeeId}/payment`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ month, status }),
  })
}

export const getShiftTemplates = () => {
  return request('/employees/shift-templates', {
    headers: getAuthHeaders(),
  })
}

export const createShiftTemplate = (shiftTemplate) => {
  return request('/employees/shift-templates', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(shiftTemplate),
  })
}

export const getShiftAssignments = ({ startDate = '', endDate = '' } = {}) => {
  const params = new URLSearchParams()

  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)

  const query = params.toString() ? `?${params.toString()}` : ''

  return request(`/employees/shift-assignments${query}`, {
    headers: getAuthHeaders(),
  })
}

export const createShiftAssignment = (assignment) => {
  return request('/employees/shift-assignments', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(assignment),
  })
}
