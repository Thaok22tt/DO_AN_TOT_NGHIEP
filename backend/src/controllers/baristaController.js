const invoiceModel = require('../models/invoiceModel')
const inventoryModel = require('../models/inventoryModel')
const productModel = require('../models/productModel')
const tableModel = require('../models/tableModel')

const allowedKitchenStatuses = ['Waiting', 'InProgress', 'Completed']

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const parseId = (value) => Number(value)

const logError = (action, error) => {
  console.error(`[barista] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const getOrders = async (req, res) => {
  try {
    const status = normalizeText(req.query.status)

    if (status && !allowedKitchenStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trang thai don pha che khong hop le' })
    }

    const orders = await invoiceModel.getKitchenOrders({ status })
    return res.json({ orders })
  } catch (error) {
    logError('get orders', error)
    return res.status(500).json({ message: 'Loi server khi tai don pha che', error: error.message })
  }
}

const getOrderById = async (req, res) => {
  try {
    const id = parseId(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'OrderId khong hop le' })
    }

    const order = await invoiceModel.findById(id)
    if (!order || order.kitchenStatus === 'Draft') {
      return res.status(404).json({ message: 'Khong tim thay don pha che' })
    }

    const details = await invoiceModel.getInvoiceDetails(id)
    return res.json({ order: { ...order, details } })
  } catch (error) {
    logError('get order detail', error)
    return res.status(500).json({ message: 'Loi server khi tai chi tiet don pha che', error: error.message })
  }
}

const acceptOrder = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    const baristaAccountId = req.user?.id ? parseId(req.user.id) : null

    if (!id) {
      return res.status(400).json({ message: 'OrderId khong duoc de trong' })
    }

    const order = await invoiceModel.findById(id)
    if (!order || order.kitchenStatus === 'Draft') {
      return res.status(404).json({ message: 'Don pha che khong ton tai trong he thong' })
    }

    if (order.kitchenStatus !== 'Waiting') {
      return res.status(400).json({ message: 'Chi duoc nhan don dang o trang thai Cho' })
    }

    await invoiceModel.updateKitchenStatus(id, 'InProgress')
    // Ghi nhận pha chế nhận đơn (chỉ ghi lần đầu)
    if (baristaAccountId) {
      await invoiceModel.setBaristaAccountId(id, baristaAccountId)
    }
    const details = await invoiceModel.getInvoiceDetails(id)
    const updatedOrder = await invoiceModel.findById(id)

    return res.json({ message: 'Da nhan don pha che', order: { ...updatedOrder, details } })
  } catch (error) {
    logError('accept order', error)
    return res.status(500).json({ message: 'Khong the nhan don pha che', error: error.message })
  }
}

const updateOrderStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    const status = normalizeText(req.body?.status)

    if (!id) {
      return res.status(400).json({ message: 'OrderId khong duoc de trong' })
    }

    if (!status || !allowedKitchenStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trang thai khong hop le' })
    }

    const order = await invoiceModel.findById(id)
    if (!order || order.kitchenStatus === 'Draft') {
      return res.status(404).json({ message: 'Don pha che khong ton tai trong he thong' })
    }

    await invoiceModel.updateKitchenStatus(id, status)
    await updateTableAfterKitchenStatus(id, status)

    const details = await invoiceModel.getInvoiceDetails(id)
    const updatedOrder = await invoiceModel.findById(id)

    return res.json({ message: 'Da cap nhat trang thai pha che', order: { ...updatedOrder, details } })
  } catch (error) {
    logError('update order status', error)
    return res.status(500).json({ message: 'Khong the cap nhat trang thai pha che', error: error.message })
  }
}

const completeOrder = async (req, res) => {
  try {
    const id = parseId(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'OrderId khong duoc de trong' })
    }

    const order = await invoiceModel.findById(id)
    if (!order || order.kitchenStatus === 'Draft') {
      return res.status(404).json({ message: 'Don pha che khong ton tai trong he thong' })
    }

    if (order.kitchenStatus !== 'InProgress') {
      return res.status(400).json({ message: 'Chi duoc hoan thanh don dang lam' })
    }

    await invoiceModel.updateKitchenStatus(id, 'Completed')
    await updateTableAfterKitchenStatus(id, 'Completed')

    const details = await invoiceModel.getInvoiceDetails(id)
    const updatedOrder = await invoiceModel.findById(id)

    return res.json({
      message: 'Da hoan thanh don pha che va thong bao cho nhan vien',
      order: { ...updatedOrder, details },
    })
  } catch (error) {
    logError('complete order', error)
    return res.status(500).json({ message: 'Khong the hoan thanh don pha che', error: error.message })
  }
}

const rejectOrder = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    const reason = normalizeText(req.body?.reason)

    if (!id) {
      return res.status(400).json({ message: 'OrderId khong duoc de trong' })
    }

    if (!reason) {
      return res.status(400).json({ message: 'Vui long nhap ly do tu choi don' })
    }

    const order = await invoiceModel.findById(id)
    if (!order || order.kitchenStatus === 'Draft') {
      return res.status(404).json({ message: 'Don pha che khong ton tai trong he thong' })
    }

    if (order.kitchenStatus === 'Completed') {
      return res.status(400).json({ message: 'Khong the tu choi don da hoan thanh' })
    }

    const rejectNote = `Pha che tu choi: ${reason}`
    const nextNote = order.note ? `${order.note}\n${rejectNote}` : rejectNote

    await invoiceModel.updateKitchenStatus(id, 'Waiting')
    await invoiceModel.updateInvoiceNote(id, nextNote)
    await updateTableAfterKitchenStatus(id, 'Waiting')

    const details = await invoiceModel.getInvoiceDetails(id)
    const updatedOrder = await invoiceModel.findById(id)

    return res.json({ message: 'Da tu choi don va ghi ly do', order: { ...updatedOrder, details } })
  } catch (error) {
    logError('reject order', error)
    return res.status(500).json({ message: 'Khong the tu choi don pha che', error: error.message })
  }
}

const getWorkspace = async (req, res) => {
  try {
    const [products, ingredients, lowStock, recipes, movements] = await Promise.all([
      productModel.getProducts(),
      inventoryModel.getIngredients(),
      inventoryModel.getLowStockIngredients(),
      inventoryModel.getRecipes(),
      inventoryModel.getMovements(),
    ])

    return res.json({
      ingredients,
      lowStock,
      movements: movements.slice(0, 20),
      products,
      recipes,
    })
  } catch (error) {
    logError('get workspace', error)
    return res.status(500).json({ message: 'Loi server khi tai du lieu pha che', error: error.message })
  }
}

const updateTableAfterKitchenStatus = async (invoiceId, kitchenStatus) => {
  try {
    const order = await invoiceModel.findById(invoiceId)
    if (!order?.tableId) return

    const table = await tableModel.findById(order.tableId)
    if (!table) return

    const nextTableStatus = kitchenStatus === 'Completed' ? 'Occupied' : 'Preparing'
    await tableModel.updateTable(order.tableId, {
      areaId: table.areaId,
      name: table.name,
      status: nextTableStatus,
    })
  } catch {
    // Cập nhật trạng thái bàn là thao tác phụ — không ảnh hưởng luồng pha chế
  }
}

const getHistory = async (req, res) => {
  try {
    const startDate = normalizeText(req.query.startDate)
    const endDate = normalizeText(req.query.endDate)

    const orders = await invoiceModel.getKitchenHistory({ startDate, endDate })
    return res.json({ orders })
  } catch (error) {
    logError('get history', error)
    return res.status(500).json({ message: 'Loi server khi tai lich su pha che', error: error.message })
  }
}

module.exports = {
  acceptOrder,
  completeOrder,
  getHistory,
  getWorkspace,
  getOrderById,
  getOrders,
  rejectOrder,
  updateOrderStatus,
}
