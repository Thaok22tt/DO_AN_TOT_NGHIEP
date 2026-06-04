const inventoryModel = require('../models/inventoryModel')
const productModel = require('../models/productModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeOptionalText = (value) => normalizeText(value) || null
const parseId = (value) => Number(value)
const allowedStatuses = ['Active', 'Inactive']

const logError = (action, error) => {
  console.error(`[inventory] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildSupplierPayload = (body = {}) => ({
  address: normalizeOptionalText(body.address),
  email: normalizeOptionalText(body.email),
  name: normalizeText(body.name),
  phone: normalizeOptionalText(body.phone),
  status: normalizeText(body.status) || 'Active',
})

const validateSupplier = (payload) => {
  if (!payload.name) return 'Vui long nhap ten nha cung cap'
  if (payload.name.length > 150) return 'Ten nha cung cap khong duoc vuot qua 150 ky tu'
  if (!allowedStatuses.includes(payload.status)) return 'Trang thai nha cung cap khong hop le'
  return null
}

const buildIngredientPayload = (body = {}) => ({
  categoryId: body.categoryId ? parseId(body.categoryId) : null,
  costPrice: Number(body.costPrice || 0),
  currentStock: Number(body.currentStock || 0),
  minStock: Number(body.minStock || 0),
  name: normalizeText(body.name),
  status: normalizeText(body.status) || 'Active',
  supplierId: body.supplierId ? parseId(body.supplierId) : null,
  unit: normalizeText(body.unit),
})

const buildCategoryPayload = (body = {}) => ({
  description: normalizeOptionalText(body.description),
  name: normalizeText(body.name),
  status: normalizeText(body.status) || 'Active',
})

const validateCategory = (payload) => {
  if (!payload.name) return 'Vui long nhap ten danh muc'
  if (payload.name.length > 150) return 'Ten danh muc khong duoc vuot qua 150 ky tu'
  if (payload.description && payload.description.length > 300) return 'Mo ta danh muc khong duoc vuot qua 300 ky tu'
  if (!allowedStatuses.includes(payload.status)) return 'Trang thai danh muc khong hop le'
  return null
}

const validateIngredient = (payload, { allowCurrentStock = true } = {}) => {
  if (!payload.name) return 'Vui long nhap ten nguyen lieu'
  if (!payload.unit) return 'Vui long nhap don vi tinh'
  if (payload.name.length > 150) return 'Ten nguyen lieu khong duoc vuot qua 150 ky tu'
  if (!Number.isFinite(payload.minStock) || payload.minStock < 0) return 'Ton toi thieu khong hop le'
  if (allowCurrentStock && (!Number.isFinite(payload.currentStock) || payload.currentStock < 0)) return 'Ton kho hien tai khong hop le'
  if (!Number.isFinite(payload.costPrice) || payload.costPrice < 0) return 'Gia von khong hop le'
  if (!allowedStatuses.includes(payload.status)) return 'Trang thai nguyen lieu khong hop le'
  return null
}

const getBootstrap = async (req, res) => {
  try {
    const [suppliers, categories, ingredients, recipes, receipts, movements, lowStock] = await Promise.all([
      inventoryModel.getSuppliers(),
      inventoryModel.getIngredientCategories(),
      inventoryModel.getIngredients(),
      inventoryModel.getRecipes(),
      inventoryModel.getReceipts(),
      inventoryModel.getMovements(),
      inventoryModel.getLowStockIngredients(),
    ])

    return res.json({ categories, ingredients, lowStock, movements, receipts, recipes, suppliers })
  } catch (error) {
    logError('get bootstrap', error)
    return res.status(500).json({ message: 'Loi server khi tai du lieu kho', error: error.message })
  }
}

const createCategory = async (req, res) => {
  const payload = buildCategoryPayload(req.body)
  try {
    const validationMessage = validateCategory(payload)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    // If an inactive category with the same name exists, reactivate it instead of inserting a duplicate
    const existing = await inventoryModel.findInactiveCategoryByName(payload.name)
    if (existing) {
      const category = await inventoryModel.updateIngredientCategory(existing.id, payload)
      return res.status(201).json({ message: 'Da them danh muc kho', category })
    }

    const category = await inventoryModel.createIngredientCategory(payload)
    return res.status(201).json({ message: 'Da them danh muc kho', category })
  } catch (error) {
    logError('create ingredient category', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Tên danh mục "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.` })
    }
    return res.status(500).json({ message: 'Khong the them danh muc kho', error: error.message })
  }
}

const updateCategory = async (req, res) => {
  const id = parseId(req.params.id)
  const payload = buildCategoryPayload(req.body)
  try {
    const validationMessage = validateCategory(payload)
    if (!id) return res.status(400).json({ message: 'Danh muc kho khong hop le' })
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const category = await inventoryModel.updateIngredientCategory(id, payload)
    return res.json({ message: 'Da cap nhat danh muc kho', category })
  } catch (error) {
    logError('update ingredient category', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Tên danh mục "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.` })
    }
    return res.status(500).json({ message: 'Khong the cap nhat danh muc kho', error: error.message })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ message: 'Danh muc kho khong hop le' })

    const category = await inventoryModel.findIngredientCategoryById(id)
    if (!category) return res.status(404).json({ message: 'Khong tim thay danh muc kho' })

    await inventoryModel.updateIngredientCategory(id, {
      description: category.description,
      name: category.name,
      status: 'Inactive',
    })

    return res.json({ message: 'Da xoa danh muc kho' })
  } catch (error) {
    logError('delete ingredient category', error)
    return res.status(500).json({ message: 'Khong the xoa danh muc kho', error: error.message })
  }
}

const createSupplier = async (req, res) => {
  try {
    const payload = buildSupplierPayload(req.body)
    const validationMessage = validateSupplier(payload)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const supplier = await inventoryModel.createSupplier(payload)
    return res.status(201).json({ message: 'Da them nha cung cap', supplier })
  } catch (error) {
    logError('create supplier', error)
    return res.status(500).json({ message: 'Khong the them nha cung cap', error: error.message })
  }
}

const updateSupplier = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    const payload = buildSupplierPayload(req.body)
    const validationMessage = validateSupplier(payload)
    if (!id) return res.status(400).json({ message: 'Nha cung cap khong hop le' })
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const supplier = await inventoryModel.updateSupplier(id, payload)
    return res.json({ message: 'Da cap nhat nha cung cap', supplier })
  } catch (error) {
    logError('update supplier', error)
    return res.status(500).json({ message: 'Khong the cap nhat nha cung cap', error: error.message })
  }
}

const createIngredient = async (req, res) => {
  const payload = buildIngredientPayload(req.body)
  try {
    const validationMessage = validateIngredient(payload)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const ingredient = await inventoryModel.createIngredient(payload)
    return res.status(201).json({ message: 'Da them nguyen lieu', ingredient })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const existing = await inventoryModel.findIngredientByName(payload.name)
      if (existing) return res.status(200).json({ message: 'Da them nguyen lieu', ingredient: existing })
    }
    logError('create ingredient', error)
    return res.status(500).json({ message: 'Khong the them nguyen lieu', error: error.message })
  }
}

const updateIngredient = async (req, res) => {
  const id = parseId(req.params.id)
  const payload = buildIngredientPayload(req.body)
  try {
    const validationMessage = validateIngredient(payload, { allowCurrentStock: false })
    if (!id) return res.status(400).json({ message: 'Nguyen lieu khong hop le' })
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const ingredient = await inventoryModel.updateIngredient(id, payload)
    return res.json({ message: 'Da cap nhat nguyen lieu', ingredient })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Tên nguyên liệu "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.` })
    }
    logError('update ingredient', error)
    return res.status(500).json({ message: 'Khong the cap nhat nguyen lieu', error: error.message })
  }
}

const adjustIngredientStock = async (req, res) => {
  try {
    const id = parseId(req.params.id)
    const quantity = Number(req.body?.quantity)
    const note = normalizeOptionalText(req.body?.note)
    if (!id) return res.status(400).json({ message: 'Nguyen lieu khong hop le' })
    if (!Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ message: 'Ton kho dieu chinh khong hop le' })

    const ingredient = await inventoryModel.adjustIngredientStock(id, { accountId: req.user?.id || null, note, quantity })
    return res.json({ message: 'Da dieu chinh ton kho', ingredient })
  } catch (error) {
    logError('adjust ingredient stock', error)
    return res.status(500).json({ message: 'Khong the dieu chinh ton kho', error: error.message })
  }
}

const createReceipt = async (req, res) => {
  try {
    const body = req.body || {}
    const details = Array.isArray(body.details) ? body.details : []
    const payload = {
      accountId: req.user?.id || null,
      details: details.map((item) => ({
        baseUnit: normalizeText(item.baseUnit),
        conversionQuantity: Number(item.conversionQuantity || 1),
        expiryDate: normalizeText(item.expiryDate) || null,
        ingredientId: parseId(item.ingredientId),
        purchaseQuantity: Number(item.purchaseQuantity || item.quantity),
        purchaseUnitPrice: Number(item.purchaseUnitPrice || 0),
        purchaseUnit: normalizeText(item.purchaseUnit),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice || 0),
      })),
      note: normalizeOptionalText(body.note),
      supplierId: body.supplierId ? parseId(body.supplierId) : null,
    }

    if (payload.details.length === 0) return res.status(400).json({ message: 'Phieu nhap phai co it nhat 1 nguyen lieu' })
    if (
      payload.details.some(
        (item) =>
          !item.ingredientId ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.purchaseQuantity) ||
          item.purchaseQuantity <= 0 ||
          !Number.isFinite(item.conversionQuantity) ||
          item.conversionQuantity <= 0 ||
          !Number.isFinite(item.purchaseUnitPrice) ||
          item.purchaseUnitPrice < 0 ||
          !item.purchaseUnit ||
          !item.baseUnit ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice < 0
      )
    ) {
      return res.status(400).json({ message: 'Chi tiet nhap kho khong hop le' })
    }

    const receipt = await inventoryModel.createReceipt(payload)
    return res.status(201).json({ message: 'Da tao phieu nhap kho', receipt })
  } catch (error) {
    logError('create receipt', error)
    return res.status(400).json({ message: error.message || 'Khong the tao phieu nhap kho', error: error.message })
  }
}

const replaceRecipe = async (req, res) => {
  try {
    const productId = parseId(req.params.productId)
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (!productId) return res.status(400).json({ message: 'Mon khong hop le' })

    const product = await productModel.findById(productId)
    if (!product) return res.status(404).json({ message: 'Khong tim thay mon' })

    const normalizedItems = items
      .map((item) => ({
        ingredientId: parseId(item.ingredientId),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.ingredientId && Number.isFinite(item.quantity) && item.quantity > 0)

    const uniqueIds = new Set(normalizedItems.map((item) => item.ingredientId))
    if (uniqueIds.size !== normalizedItems.length) return res.status(400).json({ message: 'Cong thuc bi trung nguyen lieu' })

    const recipe = await inventoryModel.replaceRecipe(productId, normalizedItems)
    return res.json({ message: 'Da cap nhat cong thuc mon', recipe })
  } catch (error) {
    logError('replace recipe', error)
    return res.status(500).json({ message: 'Khong the cap nhat cong thuc', error: error.message })
  }
}

module.exports = {
  adjustIngredientStock,
  createCategory,
  createIngredient,
  createReceipt,
  createSupplier,
  deleteCategory,
  getBootstrap,
  replaceRecipe,
  updateCategory,
  updateIngredient,
  updateSupplier,
}
