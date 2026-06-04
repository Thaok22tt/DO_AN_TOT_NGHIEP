const areaModel = require('../models/areaModel')
const tableModel = require('../models/tableModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const allowedStatuses = ['Available', 'Preparing', 'Occupied']

const logTableError = (action, error) => {
  console.error(`[tables] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildTablePayload = (body) => ({
  name: normalizeText(body.TableName ?? body.tableName ?? body.name),
  areaId: Number(body.AreaId ?? body.areaId),
  status: normalizeText(body.Status ?? body.status) || 'Available',
})

const validateTablePayload = (payload) => {
  if (!payload.name) {
    return 'Vui lòng nhập tên bàn'
  }

  if (payload.name.length > 100) {
    return 'Tên bàn không được vượt quá 100 ký tự'
  }

  if (!payload.areaId) {
    return 'Vui lòng chọn khu vực'
  }

  if (!allowedStatuses.includes(payload.status)) {
    return 'Trạng thái bàn không hợp lệ'
  }

  return null
}

const getTables = async (req, res) => {
  try {
    const keyword = normalizeText(req.query.keyword).slice(0, 100)
    const areaId = Number(req.query.areaId) || 0
    const tables = await tableModel.getTables({ keyword, areaId })

    return res.json({ tables })
  } catch (error) {
    logTableError('get tables', error)
    return res.status(500).json({ message: 'Lỗi server khi tải bàn', error: error.message })
  }
}

const createTable = async (req, res) => {
  try {
    const payload = buildTablePayload(req.body || {})
    const validationMessage = validateTablePayload(payload)

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const area = await areaModel.findById(payload.areaId)
    if (!area) {
      return res.status(400).json({ message: 'Khu vực không hợp lệ' })
    }

    const existingTable = await tableModel.findByNameInArea(payload.name, payload.areaId)
    if (existingTable) {
      return res.status(409).json({ message: 'Tên bàn đã tồn tại trong khu vực này' })
    }

    const table = await tableModel.createTable(payload)

    return res.status(201).json({ message: 'Thêm bàn thành công', table })
  } catch (error) {
    logTableError('create table', error)
    return res.status(500).json({ message: 'Lỗi server khi thêm bàn', error: error.message })
  }
}

const updateTable = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildTablePayload(req.body || {})
    const validationMessage = validateTablePayload(payload)

    if (!id) {
      return res.status(400).json({ message: 'Bàn không hợp lệ' })
    }

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage })
    }

    const table = await tableModel.findById(id)
    if (!table) {
      return res.status(404).json({ message: 'Không tìm thấy bàn' })
    }

    const area = await areaModel.findById(payload.areaId)
    if (!area) {
      return res.status(400).json({ message: 'Khu vực không hợp lệ' })
    }

    const existingTable = await tableModel.findByNameInArea(payload.name, payload.areaId, id)
    if (existingTable) {
      return res.status(409).json({ message: 'Tên bàn đã tồn tại trong khu vực này' })
    }

    const updatedTable = await tableModel.updateTable(id, payload)

    return res.json({ message: 'Cập nhật bàn thành công', table: updatedTable })
  } catch (error) {
    logTableError('update table', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật bàn', error: error.message })
  }
}

const deleteTable = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'Bàn không hợp lệ' })
    }

    const table = await tableModel.findById(id)
    if (!table) {
      return res.status(404).json({ message: 'Không tìm thấy bàn' })
    }

    await tableModel.deleteTable(id)

    return res.json({ message: 'Xóa bàn thành công' })
  } catch (error) {
    logTableError('delete table', error)
    return res.status(500).json({ message: 'Lỗi server khi xóa bàn', error: error.message })
  }
}

module.exports = {
  getTables,
  createTable,
  updateTable,
  deleteTable,
}
