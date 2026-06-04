export const formatDate = (value) => {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN').format(new Date(value))
}
