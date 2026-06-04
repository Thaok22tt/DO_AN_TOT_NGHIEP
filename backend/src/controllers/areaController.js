const areaModel = require('../models/areaModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeOptionalText = (value) => normalizeText(value) || null

const logAreaError = (action, error) => {
  console.error(`[areas] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildAreaPayload = (body) => ({
  name: normalizeText(body.AreaName ?? body.areaName ?? body.name),
  description: normalizeOptionalText(body.Description ?? body.description),
})

const validateAreaPayload = (payload) => {
  if (!payload.name) {
    return 'Vui lòng nhập tên khu vực'
  }

  if (payload.name.length > 100) {
    return 'Tên khu vực không được vượt quá 100 ký tự'
  }

  if (payload.description && payload.description.length > 300) {
    return 'Mô tả không được vượt quá 300 ký tự'
  }

  return null
}

const getAreas = async (req, res) => {
  try {
    const keyword = normalizeText(req.query.keyword).slice(0, 100)
    const areas = await areaModel.getAreas(keyword)

    return res.json({ areas })
  } catch (error) {
    logAreaError('get areas', error)
    return res.status(500).json({ message: 'Lỗi server khi tải khu vực', error: error.message })
  }
}

const createArea = async (req, res) => {
  try {
    const payload = buildAreaPayload(req.body || {})
    const validationMessage = validateAreaPayload(payload)

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const existingArea = await areaModel.findByName(payload.name)
    if (existingArea) {
      return res.status(409).json({ message: 'Tên khu vực đã tồn tại' })
    }

    const area = await areaModel.createArea(payload)

    return res.status(201).json({ message: 'Thêm khu vực thành công', area })
  } catch (error) {
    logAreaError('create area', error)
    return res.status(500).json({ message: 'Lỗi server khi thêm khu vực', error: error.message })
  }
}

const updateArea = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildAreaPayload(req.body || {})
    const validationMessage = validateAreaPayload(payload)

    if (!id) {
      return res.status(400).json({ message: 'Khu vực không hợp lệ' })
    }

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const area = await areaModel.findById(id)
    if (!area) {
      return res.status(404).json({ message: 'Không tìm thấy khu vực' })
    }

    const existingArea = await areaModel.findByName(payload.name, id)
    if (existingArea) {
      return res.status(409).json({ message: 'Tên khu vực đã tồn tại' })
    }

    const updatedArea = await areaModel.updateArea(id, payload)

    return res.json({ message: 'Cập nhật khu vực thành công', area: updatedArea })
  } catch (error) {
    logAreaError('update area', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật khu vực', error: error.message })
  }
}

const deleteArea = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'Khu vực không hợp lệ' })
    }

    const area = await areaModel.findById(id)
    if (!area) {
      return res.status(404).json({ message: 'Không tìm thấy khu vực' })
    }

    const linkedTables = await areaModel.countLinkedTables(id)
    if (linkedTables > 0) {
      return res.status(409).json({ message: 'Không thể xóa khu vực đang có bàn liên kết' })
    }

    await areaModel.deleteArea(id)

    return res.json({ message: 'Xóa khu vực thành công' })
  } catch (error) {
    logAreaError('delete area', error)
    return res.status(500).json({ message: 'Lỗi server khi xóa khu vực', error: error.message })
  }
}

module.exports = {
  getAreas,
  createArea,
  updateArea,
  deleteArea,
}
