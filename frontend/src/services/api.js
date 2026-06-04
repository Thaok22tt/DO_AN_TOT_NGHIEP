const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const request = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = data.error ? ` (${data.error})` : ''
    throw new Error(`${data.message || `Có lỗi xảy ra (${response.status})`}${detail}`)
  }

  return data
}

export default request
