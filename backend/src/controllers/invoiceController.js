const invoiceModel = require('../models/invoiceModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const allowedStatuses = ['Unpaid', 'Paid', 'Completed', 'Cancelled']
const datePattern = /^\d{4}-\d{2}-\d{2}$/

const logInvoiceError = (action, error) => {
  console.error(`[invoices] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const validateFilters = ({ status, startDate, endDate }) => {
  if (status && !allowedStatuses.includes(status)) {
    return 'Trạng thái hóa đơn không hợp lệ'
  }

  if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
    return 'Khoảng thời gian không hợp lệ'
  }

  if (startDate && endDate && startDate > endDate) {
    return 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
  }

  return null
}

const getInvoices = async (req, res) => {
  try {
    const filters = {
      keyword: normalizeText(req.query.keyword).slice(0, 100),
      status: normalizeText(req.query.status),
      startDate: normalizeText(req.query.startDate),
      endDate: normalizeText(req.query.endDate),
    }
    const validationMessage = validateFilters(filters)

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const invoices = await invoiceModel.getInvoices(filters)

    return res.json({ invoices })
  } catch (error) {
    logInvoiceError('get invoices', error)
    return res.status(500).json({ message: 'Lỗi server khi tải hóa đơn', error: error.message })
  }
}

const getInvoiceById = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'Hóa đơn không hợp lệ' })
    }

    const invoice = await invoiceModel.findById(id)
    if (!invoice) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' })
    }

    const details = await invoiceModel.getInvoiceDetails(id)

    return res.json({ invoice: { ...invoice, details } })
  } catch (error) {
    logInvoiceError('get invoice detail', error)
    return res.status(500).json({ message: 'Lỗi server khi tải chi tiết hóa đơn', error: error.message })
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
}
