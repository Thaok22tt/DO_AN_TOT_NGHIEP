import PropTypes from 'prop-types'

export const accountShape = PropTypes.shape({
  email: PropTypes.string,
  fullName: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  phoneNumber: PropTypes.string,
  role: PropTypes.string,
  roleId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  username: PropTypes.string,
})

export const employeeShape = PropTypes.shape({
  accountId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  accountStatus: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  birthDate: PropTypes.string,
  fullName: PropTypes.string,
  gender: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  phoneNumber: PropTypes.string,
  position: PropTypes.string,
  workShift: PropTypes.string,
  username: PropTypes.string,
})

export const categoryShape = PropTypes.shape({
  createdAt: PropTypes.string,
  description: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
  updatedAt: PropTypes.string,
})

export const areaShape = PropTypes.shape({
  createdAt: PropTypes.string,
  description: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
  updatedAt: PropTypes.string,
})

export const tableShape = PropTypes.shape({
  areaId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  areaName: PropTypes.string,
  createdAt: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
  status: PropTypes.string,
  updatedAt: PropTypes.string,
})

export const invoiceShape = PropTypes.shape({
  areaName: PropTypes.string,
  cashierName: PropTypes.string,
  code: PropTypes.string,
  createdAt: PropTypes.string,
  customerName: PropTypes.string,
  discountAmount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  paymentMethod: PropTypes.string,
  promotionDiscountType: PropTypes.string,
  promotionDiscountValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  promotionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  promotionName: PropTypes.string,
  status: PropTypes.string,
  subtotal: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  tableName: PropTypes.string,
  totalAmount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  updatedAt: PropTypes.string,
})

export const productShape = PropTypes.shape({
  categoryId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  categoryName: PropTypes.string,
  createdAt: PropTypes.string,
  description: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  image: PropTypes.string,
  name: PropTypes.string,
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  status: PropTypes.string,
  updatedAt: PropTypes.string,
})

export const promotionShape = PropTypes.shape({
  createdAt: PropTypes.string,
  discountType: PropTypes.string,
  discountValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  endDate: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
  startDate: PropTypes.string,
  status: PropTypes.string,
  updatedAt: PropTypes.string,
})

export const roleShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string,
})

export const navItemShape = PropTypes.shape({
  description: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
})
