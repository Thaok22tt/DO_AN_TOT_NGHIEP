const categoryModel = require('../models/categoryModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeOptionalText = (value) => normalizeText(value) || null

const logCategoryError = (action, error) => {
  console.error(`[categories] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildCategoryPayload = (body) => ({
  name: normalizeText(body.CategoryName ?? body.categoryName ?? body.name),
  description: normalizeOptionalText(body.Description ?? body.description),
})

const validateCategoryPayload = (payload) => {
  if (!payload.name) {
    return 'Vui lòng nhập tên danh mục'
  }

  if (payload.name.length > 100) {
    return 'Tên danh mục không được vượt quá 100 ký tự'
  }

  if (payload.description && payload.description.length > 500) {
    return 'Mô tả không được vượt quá 500 ký tự'
  }

  return null
}

const getCategories = async (req, res) => {
  try {
    const keyword = normalizeText(req.query.keyword).slice(0, 100)
    const categories = await categoryModel.getCategories(keyword)

    return res.json({ categories })
  } catch (error) {
    logCategoryError('get categories', error)
    return res.status(500).json({ message: 'Lỗi server khi tải danh mục', error: error.message })
  }
}

const createCategory = async (req, res) => {
  try {
    const payload = buildCategoryPayload(req.body || {})
    const validationMessage = validateCategoryPayload(payload)

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const existingCategory = await categoryModel.findByName(payload.name)
    if (existingCategory) {
      return res.status(409).json({ message: 'Tên danh mục đã tồn tại' })
    }

    const category = await categoryModel.createCategory(payload)

    return res.status(201).json({ message: 'Thêm danh mục thành công', category })
  } catch (error) {
    logCategoryError('create category', error)
    return res.status(500).json({ message: 'Lỗi server khi thêm danh mục', error: error.message })
  }
}

const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildCategoryPayload(req.body || {})
    const validationMessage = validateCategoryPayload(payload)

    if (!id) {
      return res.status(400).json({ message: 'Danh mục không hợp lệ' })
    }

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const category = await categoryModel.findById(id)
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' })
    }

    const existingCategory = await categoryModel.findByName(payload.name, id)
    if (existingCategory) {
      return res.status(409).json({ message: 'Tên danh mục đã tồn tại' })
    }

    const updatedCategory = await categoryModel.updateCategory(id, payload)

    return res.json({ message: 'Cập nhật danh mục thành công', category: updatedCategory })
  } catch (error) {
    logCategoryError('update category', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật danh mục', error: error.message })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'Danh mục không hợp lệ' })
    }

    const category = await categoryModel.findById(id)
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' })
    }

    const linkedProducts = await categoryModel.countLinkedProducts(id)
    if (linkedProducts > 0) {
      return res.status(409).json({ message: 'Không thể xóa danh mục đang có món liên kết' })
    }

    await categoryModel.deleteCategory(id)

    return res.json({ message: 'Xóa danh mục thành công' })
  } catch (error) {
    logCategoryError('delete category', error)
    return res.status(500).json({ message: 'Lỗi server khi xóa danh mục', error: error.message })
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
}
