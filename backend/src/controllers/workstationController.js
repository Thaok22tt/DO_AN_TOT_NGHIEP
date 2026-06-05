const areaModel = require('../models/areaModel')
const invoiceModel = require('../models/invoiceModel')
const inventoryModel = require('../models/inventoryModel')
const productModel = require('../models/productModel')
const promotionModel = require('../models/promotionModel')
const tableModel = require('../models/tableModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const logError = (action, error) => {
  console.error(`[workstation] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const parseId = (value) => Number(value)

const toStatus = (value) => normalizeText(value) || 'Unpaid'

const getBootstrap = async (req, res) => {
  try {
    const [areas, tables, products, promotions, invoices] = await Promise.all([
      areaModel.getAreas(),
      tableModel.getTables(),
      productModel.getProducts(),
      promotionModel.getPromotions(),
      invoiceModel.getInvoices(),
    ])

    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => ({
        ...invoice,
        details: await invoiceModel.getInvoiceDetails(invoice.id),
      }))
    )

    return res.json({
      areas,
      invoices: invoicesWithDetails,
      products,
      promotions,
      tables,
    })
  } catch (error) {
    logError('get bootstrap', error)
    return res.status(500).json({ message: 'Loi server khi tai du lieu ban hang', error: error.message })
  }
}

const getInvoices = async (req, res) => {
  try {
    const filters = {
      keyword: normalizeText(req.query.keyword).slice(0, 100),
      status: normalizeText(req.query.status),
      startDate: normalizeText(req.query.startDate),
      endDate: normalizeText(req.query.endDate),
    }

    const invoices = await invoiceModel.getInvoices(filters)
    return res.json({ invoices })
  } catch (error) {
    logError('get invoices', error)
    return res.status(500).json({ message: 'Loi server khi tai hoa don', error: error.message })
  }
}

const getInvoiceById = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    const invoice = await invoiceModel.findById(id)
    if (!invoice) {
      return res.status(404).json({ message: 'Khong tim thay hoa don' })
    }

    const details = await invoiceModel.getInvoiceDetails(id)
    const totals = await invoiceModel.getInvoiceTotals(id)

    return res.json({ invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('get invoice detail', error)
    return res.status(500).json({ message: 'Loi server khi tai chi tiet hoa don', error: error.message })
  }
}

const createInvoice = async (req, res) => {
  try {
    const body = req.body || {}
    const areaId = parseId(body.areaId)
    const tableId = body.tableId ? parseId(body.tableId) : null
    const accountId = req.user?.id ? parseId(req.user.id) : null
    const requestedOrderType = normalizeText(body.orderType)
    const orderType = ['DineIn', 'Takeaway', 'Ship'].includes(requestedOrderType) ? requestedOrderType : 'DineIn'
    const note = normalizeText(body.note).slice(0, 500) || null
    const promotionId = body.promotionId ? parseId(body.promotionId) : null
    const customerName = normalizeText(body.customerName).slice(0, 100) || null
    const serviceNumber = normalizeText(body.serviceNumber).slice(0, 20) || null
    const shippingFee = orderType === 'Ship' ? Math.max(Number(body.shippingFee || 0), 0) : 0
    const customerPhone = orderType === 'Ship' ? normalizeText(body.customerPhone).slice(0, 20) || null : null
    const deliveryAddress = orderType === 'Ship' ? normalizeText(body.deliveryAddress).slice(0, 300) || null : null
    const deliveryNote = orderType === 'Ship' ? normalizeText(body.deliveryNote).slice(0, 300) || null : null

    if (orderType === 'DineIn' && !serviceNumber) {
      return res.status(400).json({ message: 'Vui long nhap so the' })
    }

    if (orderType === 'Ship' && (!customerPhone || !deliveryAddress)) {
      return res.status(400).json({ message: 'Vui long nhap SĐT va dia chi giao hang' })
    }

    if (orderType === 'DineIn' && tableId) {
      const table = await tableModel.findById(tableId)
      if (!table) {
        return res.status(400).json({ message: 'Ban khong hop le' })
      }

      if (areaId && Number(table.areaId) !== areaId) {
        return res.status(400).json({ message: 'Ban khong thuoc khu vuc da chon' })
      }

      if (table.status !== 'Available') {
        return res.status(400).json({ message: 'Chi co the chon ban con trong' })
      }
    }

    const invoice = await invoiceModel.createInvoice({
      accountId,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryNote,
      note,
      orderType,
      promotionId,
      serviceNumber,
      shippingFee,
      tableId: orderType === 'DineIn' ? tableId : null,
    })

    return res.status(201).json({ message: 'Tao hoa don thanh cong', invoice })
  } catch (error) {
    logError('create invoice', error)
    return res.status(500).json({ message: 'Loi server khi tao hoa don', error: error.message })
  }
}

const addInvoiceItem = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const body = req.body || {}
    const productId = parseId(body.productId)
    const quantity = parseId(body.quantity)
    const note = normalizeText(body.note).slice(0, 200) || null
    const requestedSize = normalizeText(body.size).toUpperCase()
    const size = ['M', 'L'].includes(requestedSize) ? requestedSize : null

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    if (!productId) {
      return res.status(400).json({ message: 'Vui long chon mon' })
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'So luong phai lon hon 0' })
    }

    const invoice = await invoiceModel.addInvoiceItem(invoiceId, { note, productId, quantity, size })
    const details = await invoiceModel.getInvoiceDetails(invoiceId)

    return res.json({ message: 'Da them mon vao hoa don', invoice: { ...invoice, details } })
  } catch (error) {
    logError('add invoice item', error)
    return res.status(400).json({ message: error.message || 'Khong the them mon', error: error.message })
  }
}

const updateInvoiceDetailSize = async (req, res) => {
  try {
    const detailId = parseId(req.params.detailId)
    const size = normalizeText(req.body?.size).toUpperCase()
    const note = normalizeText(req.body?.note).slice(0, 200)

    if (!detailId) {
      return res.status(400).json({ message: 'Chi tiet hoa don khong hop le' })
    }

    if (!['M', 'L'].includes(size)) {
      return res.status(400).json({ message: 'Size ly khong hop le' })
    }

    const invoice = await invoiceModel.updateInvoiceDetailSize(detailId, { note, size })
    const details = await invoiceModel.getInvoiceDetails(invoice.id)
    const totals = await invoiceModel.getInvoiceTotals(invoice.id)

    return res.json({ message: 'Da cap nhat size ly', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('update invoice detail size', error)
    return res.status(400).json({ message: error.message || 'Khong the cap nhat size ly', error: error.message })
  }
}

const updateInvoiceDetailQuantity = async (req, res) => {
  try {
    const detailId = parseId(req.params.detailId)
    const quantity = parseId(req.body?.quantity)

    if (!detailId) {
      return res.status(400).json({ message: 'Chi tiet hoa don khong hop le' })
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'So luong phai lon hon 0' })
    }

    const invoice = await invoiceModel.updateInvoiceDetailQuantity(detailId, quantity)
    const details = await invoiceModel.getInvoiceDetails(invoice.id)

    return res.json({ message: 'Da cap nhat so luong', invoice: { ...invoice, details } })
  } catch (error) {
    logError('update invoice detail quantity', error)
    return res.status(400).json({ message: error.message || 'Khong the cap nhat so luong', error: error.message })
  }
}

const deleteInvoiceDetail = async (req, res) => {
  try {
    const detailId = parseId(req.params.detailId)

    if (!detailId) {
      return res.status(400).json({ message: 'Chi tiet hoa don khong hop le' })
    }

    await invoiceModel.deleteInvoiceDetail(detailId)
    return res.json({ message: 'Da xoa mon khoi hoa don' })
  } catch (error) {
    logError('delete invoice detail', error)
    return res.status(400).json({ message: error.message || 'Khong the xoa mon', error: error.message })
  }
}

const updateInvoiceNote = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const note = normalizeText(req.body?.note).slice(0, 500)

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    await invoiceModel.updateInvoiceNote(invoiceId, note)
    return res.json({ message: 'Da cap nhat ghi chu' })
  } catch (error) {
    logError('update invoice note', error)
    return res.status(500).json({ message: 'Khong the cap nhat ghi chu', error: error.message })
  }
}

const updateInvoiceDetailNote = async (req, res) => {
  try {
    const detailId = parseId(req.params.detailId)
    const note = normalizeText(req.body?.note).slice(0, 200)

    if (!detailId) {
      return res.status(400).json({ message: 'Chi tiet hoa don khong hop le' })
    }

    await invoiceModel.updateInvoiceDetailNote(detailId, note)
    return res.json({ message: 'Da cap nhat ghi chu mon' })
  } catch (error) {
    logError('update invoice detail note', error)
    return res.status(500).json({ message: 'Khong the cap nhat ghi chu mon', error: error.message })
  }
}

const sendToKitchen = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    const invoice = await invoiceModel.findById(invoiceId)
    if (!invoice) {
      return res.status(404).json({ message: 'Khong tim thay hoa don' })
    }

    if (invoice.kitchenStatus !== 'Draft') {
      return res.status(400).json({ message: 'Don da gui pha che' })
    }

    const details = await invoiceModel.getInvoiceDetails(invoiceId)
    if (details.length === 0) {
      return res.status(400).json({ message: 'Hoa don phai co it nhat 1 mon' })
    }

    await inventoryModel.consumeInvoiceStock(invoiceId, req.user?.id || null)
    await invoiceModel.setKitchenStatus(invoiceId, 'Waiting')
    if (invoice.tableId) {
      try {
        const table = await tableModel.findById(invoice.tableId)
        if (table) {
          await tableModel.updateTable(invoice.tableId, {
            areaId: table.areaId,
            name: table.name,
            status: 'Preparing',
          })
        }
      } catch {
        // Cập nhật trạng thái bàn là thao tác phụ — không ảnh hưởng luồng gửi pha chế
      }
    }
    return res.json({ message: 'Da gui yeu cau den pha che' })
  } catch (error) {
    logError('send to kitchen', error)
    return res.status(500).json({ message: 'Khong the gui pha che', error: error.message })
  }
}

const updateInvoiceStatus = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const status = toStatus(req.body?.status)

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    if (!['Unpaid', 'Paid', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Trang thai khong hop le' })
    }

    const invoice = await invoiceModel.findById(invoiceId)
    if (!invoice) {
      return res.status(404).json({ message: 'Khong tim thay hoa don' })
    }

    if (status === 'Cancelled' && invoice.kitchenStatus === 'Completed') {
      return res.status(400).json({ message: 'Khong the huy hoa don da pha che xong' })
    }

    await invoiceModel.updateInvoiceStatus(invoiceId, status)

    if (status === 'Cancelled' && invoice?.tableId) {
      const table = await tableModel.findById(invoice.tableId)
      if (table) {
        await tableModel.updateTable(invoice.tableId, {
          areaId: table.areaId,
          name: table.name,
          status: 'Available',
        })
      }
    }

    return res.json({ message: 'Da cap nhat trang thai hoa don' })
  } catch (error) {
    logError('update invoice status', error)
    return res.status(500).json({ message: 'Khong the cap nhat trang thai', error: error.message })
  }
}

const applyPromotion = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const promotionCode = normalizeText(req.body?.promotionCode || req.body?.promotionName).slice(0, 150)
    let promotionId = req.body?.promotionId ? parseId(req.body.promotionId) : null

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    if (!promotionId && promotionCode) {
      // Tìm theo mã trước, nếu không có thì tìm theo tên
      const promotion =
        (await promotionModel.findActiveByCode(promotionCode)) ||
        (await promotionModel.findActiveByName(promotionCode))

      if (!promotion) {
        return res.status(400).json({ message: 'Khuyen mai khong hop le hoac da het han' })
      }

      promotionId = promotion.id
    }

    const invoice = await invoiceModel.applyPromotion(invoiceId, promotionId)
    const details = await invoiceModel.getInvoiceDetails(invoiceId)
    const totals = await invoiceModel.getInvoiceTotals(invoiceId)

    return res.json({ message: 'Da ap dung khuyen mai', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('apply promotion', error)
    return res.status(400).json({ message: error.message || 'Khong the ap dung khuyen mai', error: error.message })
  }
}

const updatePaymentMethod = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const paymentMethod = normalizeText(req.body?.paymentMethod)

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Vui long chon phuong thuc thanh toan' })
    }

    await invoiceModel.updatePaymentMethod(invoiceId, paymentMethod)
    return res.json({ message: 'Da cap nhat phuong thuc thanh toan' })
  } catch (error) {
    logError('update payment method', error)
    return res.status(500).json({ message: 'Khong the cap nhat phuong thuc thanh toan', error: error.message })
  }
}

const confirmPayment = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const paymentMethod = normalizeText(req.body?.paymentMethod)
    const amountReceived = req.body?.amountReceived === undefined ? null : Number(req.body.amountReceived)

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Vui long chon phuong thuc thanh toan' })
    }

    const invoice = await invoiceModel.confirmPayment(invoiceId, { amountReceived, paymentMethod })
    const details = await invoiceModel.getInvoiceDetails(invoiceId)
    const totals = await invoiceModel.getInvoiceTotals(invoiceId)

    return res.json({ message: 'Da xac nhan thanh toan', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('confirm payment', error)
    return res.status(400).json({ message: error.message || 'Khong the xac nhan thanh toan', error: error.message })
  }
}

const completeInvoice = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    const invoice = await invoiceModel.completeInvoice(invoiceId)
    const details = await invoiceModel.getInvoiceDetails(invoiceId)
    const totals = await invoiceModel.getInvoiceTotals(invoiceId)

    return res.json({ message: 'Da hoan tat hoa don', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('complete invoice', error)
    return res.status(400).json({ message: error.message || 'Khong the hoan tat hoa don', error: error.message })
  }
}

const updateTableStatus = async (req, res) => {
  try {
    const tableId = parseId(req.params.id)
    const status = normalizeText(req.body?.status)

    if (!tableId) {
      return res.status(400).json({ message: 'Ban khong hop le' })
    }

    if (!['Available', 'Preparing', 'Occupied'].includes(status)) {
      return res.status(400).json({ message: 'Trang thai ban khong hop le' })
    }

    const table = await tableModel.findById(tableId)
    if (!table) {
      return res.status(404).json({ message: 'Khong tim thay ban' })
    }

    const hasOpenInvoice = (await invoiceModel.getInvoices()).some(
      (invoice) => Number(invoice.tableId) === tableId && invoice.status === 'Unpaid',
    )

    if (status === 'Available' && hasOpenInvoice) {
      return res.status(400).json({ message: 'Ban dang co hoa don chua thanh toan' })
    }

    const updatedTable = await tableModel.updateTable(tableId, {
      areaId: table.areaId,
      name: table.name,
      status,
    })

    return res.json({ message: 'Da cap nhat trang thai ban', table: updatedTable })
  } catch (error) {
    logError('update table status', error)
    return res.status(500).json({ message: 'Khong the cap nhat trang thai ban', error: error.message })
  }
}

const transferInvoiceTable = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)
    const targetTableId = parseId(req.body?.targetTableId)

    if (!invoiceId || !targetTableId) {
      return res.status(400).json({ message: 'Hoa don hoac ban dich khong hop le' })
    }

    const invoice = await invoiceModel.transferInvoiceTable(invoiceId, targetTableId)
    const details = await invoiceModel.getInvoiceDetails(invoiceId)
    const totals = await invoiceModel.getInvoiceTotals(invoiceId)

    return res.json({ message: 'Da chuyen ban', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('transfer table', error)
    return res.status(400).json({ message: error.message || 'Khong the chuyen ban', error: error.message })
  }
}

const mergeInvoices = async (req, res) => {
  try {
    const sourceInvoiceId = parseId(req.params.id)
    const targetInvoiceId = parseId(req.body?.targetInvoiceId)

    if (!sourceInvoiceId || !targetInvoiceId) {
      return res.status(400).json({ message: 'Hoa don gop khong hop le' })
    }

    const invoice = await invoiceModel.mergeInvoices(sourceInvoiceId, targetInvoiceId)
    const details = await invoiceModel.getInvoiceDetails(targetInvoiceId)
    const totals = await invoiceModel.getInvoiceTotals(targetInvoiceId)

    return res.json({ message: 'Da gop ban', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('merge invoices', error)
    return res.status(400).json({ message: error.message || 'Khong the gop ban', error: error.message })
  }
}

const markInvoiceServed = async (req, res) => {
  try {
    const invoiceId = parseId(req.params.id)

    if (!invoiceId) {
      return res.status(400).json({ message: 'Hoa don khong hop le' })
    }

    const invoice = await invoiceModel.markServed(invoiceId)
    const details = await invoiceModel.getInvoiceDetails(invoiceId)
    const totals = await invoiceModel.getInvoiceTotals(invoiceId)

    return res.json({ message: 'Da xac nhan mang mon ra ban', invoice: { ...invoice, details, ...totals } })
  } catch (error) {
    logError('mark served', error)
    return res.status(400).json({ message: error.message || 'Khong the xac nhan phuc vu', error: error.message })
  }
}

const getMyInvoices = async (req, res) => {
  try {
    const accountId = req.user?.id ? parseId(req.user.id) : null
    if (!accountId) {
      return res.status(401).json({ message: 'Khong xac dinh duoc tai khoan' })
    }

    const filters = {
      accountId,
      keyword: normalizeText(req.query.keyword).slice(0, 100),
      status: normalizeText(req.query.status),
      startDate: normalizeText(req.query.startDate),
      endDate: normalizeText(req.query.endDate),
    }

    const invoices = await invoiceModel.getInvoices(filters)
    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => ({
        ...invoice,
        details: await invoiceModel.getInvoiceDetails(invoice.id),
      }))
    )

    return res.json({ invoices: invoicesWithDetails })
  } catch (error) {
    logError('get my invoices', error)
    return res.status(500).json({ message: 'Loi server khi tai lich su hoa don', error: error.message })
  }
}

const startDelivery = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: 'Hoa don khong hop le' })

    const invoice = await invoiceModel.findById(id)
    if (!invoice || invoice.orderType !== 'Ship') {
      return res.status(404).json({ message: 'Khong tim thay don ship' })
    }
    if (invoice.kitchenStatus !== 'Completed') {
      return res.status(400).json({ message: 'Don phai pha che xong moi co the giao' })
    }
    if (invoice.deliveryStatus === 'Delivering' || invoice.deliveryStatus === 'Delivered') {
      return res.status(400).json({ message: 'Don da duoc bat dau giao hoac da giao' })
    }

    const updated = await invoiceModel.startDelivery(id)
    return res.json({ message: 'Bat dau giao hang', invoice: updated })
  } catch (error) {
    logError('start delivery', error)
    return res.status(500).json({ message: 'Loi server khi bat dau giao hang', error: error.message })
  }
}

const completeDelivery = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: 'Hoa don khong hop le' })

    const invoice = await invoiceModel.findById(id)
    if (!invoice || invoice.orderType !== 'Ship') {
      return res.status(404).json({ message: 'Khong tim thay don ship' })
    }
    if (invoice.deliveryStatus !== 'Delivering') {
      return res.status(400).json({ message: 'Don phai dang giao moi co the xac nhan da giao' })
    }

    const amountReceived = invoice.paymentMethod === 'COD'
      ? Math.max(Number(req.body?.amountReceived || 0), 0)
      : null

    const updated = await invoiceModel.completeDelivery(id, { amountReceived })
    return res.json({ message: 'Da giao hang thanh cong', invoice: updated })
  } catch (error) {
    logError('complete delivery', error)
    return res.status(500).json({ message: 'Loi server khi xac nhan da giao', error: error.message })
  }
}

module.exports = {
  addInvoiceItem,
  applyPromotion,
  completeInvoice,
  confirmPayment,
  createInvoice,
  startDelivery,
  completeDelivery,
  deleteInvoiceDetail,
  getBootstrap,
  getInvoiceById,
  getInvoices,
  getMyInvoices,
  markInvoiceServed,
  mergeInvoices,
  sendToKitchen,
  transferInvoiceTable,
  updateInvoiceDetailNote,
  updateInvoiceDetailQuantity,
  updateInvoiceDetailSize,
  updateInvoiceNote,
  updateInvoiceStatus,
  updatePaymentMethod,
  updateTableStatus,
}
