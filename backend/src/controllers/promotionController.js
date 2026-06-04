const promotionModel = require('../models/promotionModel')

const DISCOUNT_TYPES = ['Percent', 'Fixed']
const STATUSES = ['Active', 'Inactive']

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeDate = (value) => normalizeText(value).slice(0, 10)

const logPromotionError = (action, error) => {
  console.error(`[promotions] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildPromotionPayload = (body) => ({
  name: normalizeText(body.PromotionName ?? body.promotionName ?? body.name),
  code: normalizeText(body.PromotionCode ?? body.promotionCode ?? body.code).toUpperCase().replace(/\s+/g, '') || null,
  discountType: normalizeText(body.DiscountType ?? body.discountType) || 'Percent',
  discountValue: Number(body.DiscountValue ?? body.discountValue),
  startDate: normalizeDate(body.StartDate ?? body.startDate),
  endDate: normalizeDate(body.EndDate ?? body.endDate),
  status: normalizeText(body.Status ?? body.status) || 'Active',
})

const validatePromotionPayload = (payload) => {
  if (!payload.name) {
    return 'Vui lòng nhập tên khuyến mại'
  }

  if (payload.name.length > 150) {
    return 'Tên khuyến mại không được vượt quá 150 ký tự'
  }

  if (!DISCOUNT_TYPES.includes(payload.discountType)) {
    return 'Loại giảm giá không hợp lệ'
  }

  if (!Number.isFinite(payload.discountValue) || payload.discountValue <= 0) {
    return 'Giá trị giảm giá phải lớn hơn 0'
  }

  if (payload.discountType === 'Percent' && payload.discountValue > 100) {
    return 'Giá trị giảm theo phần trăm không được vượt quá 100'
  }

  if (!payload.startDate || !payload.endDate) {
    return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc'
  }

  if (payload.startDate > payload.endDate) {
    return 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
  }

  if (!STATUSES.includes(payload.status)) {
    return 'Trạng thái khuyến mại không hợp lệ'
  }

  return null
}

const getPromotions = async (req, res) => {
  try {
    const keyword = normalizeText(req.query.keyword).slice(0, 100)
    const promotions = await promotionModel.getPromotions(keyword)

    return res.json({ promotions })
  } catch (error) {
    logPromotionError('get promotions', error)
    return res.status(500).json({ message: 'Lỗi server khi tải khuyến mại', error: error.message })
  }
}

const createPromotion = async (req, res) => {
  try {
    const payload = buildPromotionPayload(req.body || {})
    const validationMessage = validatePromotionPayload(payload)

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const existingPromotion = await promotionModel.findByName(payload.name)
    if (existingPromotion) {
      return res.status(409).json({ message: 'Tên khuyến mại đã tồn tại' })
    }

    const promotion = await promotionModel.createPromotion(payload)

    return res.status(201).json({ message: 'Thêm khuyến mại thành công', promotion })
  } catch (error) {
    logPromotionError('create promotion', error)
    return res.status(500).json({ message: 'Lỗi server khi thêm khuyến mại', error: error.message })
  }
}

const updatePromotion = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildPromotionPayload(req.body || {})
    const validationMessage = validatePromotionPayload(payload)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Khuyến mại không hợp lệ' })
    }

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const promotion = await promotionModel.findById(id)
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mại' })
    }

    const existingPromotion = await promotionModel.findByName(payload.name, id)
    if (existingPromotion) {
      return res.status(409).json({ message: 'Tên khuyến mại đã tồn tại' })
    }

    const updatedPromotion = await promotionModel.updatePromotion(id, payload)

    return res.json({ message: 'Cập nhật khuyến mại thành công', promotion: updatedPromotion })
  } catch (error) {
    logPromotionError('update promotion', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật khuyến mại', error: error.message })
  }
}

const deletePromotion = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Khuyến mại không hợp lệ' })
    }

    const promotion = await promotionModel.findById(id)
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mại' })
    }

    if (await promotionModel.isActivePromotion(id)) {
      return res.status(409).json({ message: 'Không thể xóa khuyến mại đang áp dụng' })
    }

    await promotionModel.deletePromotion(id)

    return res.json({ message: 'Xóa khuyến mại thành công' })
  } catch (error) {
    logPromotionError('delete promotion', error)
    return res.status(500).json({ message: 'Lỗi server khi xóa khuyến mại', error: error.message })
  }
}

module.exports = {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
}
