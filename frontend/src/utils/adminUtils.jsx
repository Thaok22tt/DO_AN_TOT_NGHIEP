export const getErrorMessage = (error) => {
  const message = error?.message || ''

  if (message === 'Failed to fetch' || message === 'NetworkError when attempting to fetch resource.') {
    return 'Không thể kết nối đến server. Vui lòng thử lại sau.'
  }

  return message || 'Có lỗi xảy ra. Vui lòng thử lại.'
}

export const renderMaterialIcon = (icon, className = '') => (
  <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
    {icon}
  </span>
)

export const getAccountInitial = (account) =>
  String(account.username || account.fullName || '?').trim().charAt(0).toUpperCase()

export const getEmployeeInitial = (employee) =>
  String(employee.fullName || employee.username || '?').trim().charAt(0).toUpperCase()
