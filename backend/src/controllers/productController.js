const cloudinary = require('cloudinary').v2
const categoryModel = require('../models/categoryModel')
const productModel = require('../models/productModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeOptionalText = (value) => normalizeText(value) || null
const allowedStatuses = ['Active', 'Inactive']

const removeUploadedFile = (file) => {
  if (file?.filename) {
    cloudinary.uploader.destroy(file.filename, () => {})
  }
}

const removeProductImage = (image) => {
  if (!image) return
  const parts = image.split('/')
  const filenameWithExt = parts[parts.length - 1]
  const publicId = `products/${filenameWithExt.split('.')[0]}`
  cloudinary.uploader.destroy(publicId, () => {})
}

const logProductError = (action, error) => {
  console.error(`[products] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildProductPayload = (body, file, currentImage = null) => ({
  name: normalizeText(body.ProductName ?? body.productName ?? body.name),
  categoryId: Number(body.CategoryId ?? body.categoryId),
  price: Number(body.Price ?? body.price),
  description: normalizeOptionalText(body.Description ?? body.description),
  image: file ? file.path : currentImage,
  status: normalizeText(body.Status ?? body.status) || 'Active',
})

const validateProductPayload = (payload) => {
  if (!payload.name) {
    return 'Vui lòng nhập tên món'
  }

  if (payload.name.length > 150) {
    return 'Tên món không được vượt quá 150 ký tự'
  }

  if (!payload.categoryId) {
    return 'Vui lòng chọn danh mục'
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    return 'Giá món phải lớn hơn 0'
  }

  if (payload.description && payload.description.length > 500) {
    return 'Mô tả không được vượt quá 500 ký tự'
  }

  if (!allowedStatuses.includes(payload.status)) {
    return 'Trạng thái món không hợp lệ'
  }

  return null
}

const getProducts = async (req, res) => {
  try {
    const keyword = normalizeText(req.query.keyword).slice(0, 100)
    const categoryId = Number(req.query.categoryId) || 0
    const products = await productModel.getProducts({ keyword, categoryId })

    return res.json({ products })
  } catch (error) {
    logProductError('get products', error)
    return res.status(500).json({ message: 'Lỗi server khi tải menu', error: error.message })
  }
}

const createProduct = async (req, res) => {
  try {
    const payload = buildProductPayload(req.body || {}, req.file)
    const validationMessage = validateProductPayload(payload)

    if (validationMessage) {
      removeUploadedFile(req.file)
      return res.status(400).json({ message: validationMessage })
    }

    const category = await categoryModel.findById(payload.categoryId)
    if (!category) {
      removeUploadedFile(req.file)
      return res.status(400).json({ message: 'Danh mục không hợp lệ' })
    }

    const product = await productModel.createProduct(payload)

    return res.status(201).json({ message: 'Thêm món thành công', product })
  } catch (error) {
    removeUploadedFile(req.file)
    logProductError('create product', error)
    return res.status(500).json({ message: 'Lỗi server khi thêm món', error: error.message })
  }
}

const updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      removeUploadedFile(req.file)
      return res.status(400).json({ message: 'Món không hợp lệ' })
    }

    const currentProduct = await productModel.findById(id)
    if (!currentProduct) {
      removeUploadedFile(req.file)
      return res.status(404).json({ message: 'Không tìm thấy món' })
    }

    const payload = buildProductPayload(req.body || {}, req.file, currentProduct.image)
    const validationMessage = validateProductPayload(payload)

    if (validationMessage) {
      removeUploadedFile(req.file)
      return res.status(400).json({ message: validationMessage })
    }

    const category = await categoryModel.findById(payload.categoryId)
    if (!category) {
      removeUploadedFile(req.file)
      return res.status(400).json({ message: 'Danh mục không hợp lệ' })
    }

    const updatedProduct = await productModel.updateProduct(id, payload)

    if (req.file && currentProduct.image) {
      removeProductImage(currentProduct.image)
    }

    return res.json({ message: 'Cập nhật món thành công', product: updatedProduct })
  } catch (error) {
    removeUploadedFile(req.file)
    logProductError('update product', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật món', error: error.message })
  }
}

const deleteProduct = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'Món không hợp lệ' })
    }

    const product = await productModel.findById(id)
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy món' })
    }

    await productModel.deleteProduct(id)
    removeProductImage(product.image)

    return res.json({ message: 'Xóa món thành công' })
  } catch (error) {
    logProductError('delete product', error)
    return res.status(500).json({ message: 'Lỗi server khi xóa món', error: error.message })
  }
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
}
