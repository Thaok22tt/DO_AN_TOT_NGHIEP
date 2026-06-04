const employeeModel = require('../models/employeeModel')
const userModel = require('../models/userModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeOptionalText = (value) => normalizeText(value) || null
const phonePattern = /^(0|\+84)[0-9]{8,10}$/

const getStatusValue = (status) => {
  if (status === true || status === 1 || status === '1' || status === 'active') return 1
  if (status === false || status === 0 || status === '0' || status === 'inactive' || status === 'locked') return 0
  return null
}

const isValidDate = (value) => {
  if (!value) return true
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(value || ''))

const logEmployeeError = (action, error) => {
  console.error(`[employees] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const buildEmployeePayload = (body) => ({
  fullName: normalizeText(body.fullName),
  phoneNumber: normalizeOptionalText(body.phoneNumber),
  birthDate: normalizeOptionalText(body.birthDate),
  gender: normalizeOptionalText(body.gender),
  identityNumber: normalizeOptionalText(body.identityNumber),
  hireDate: normalizeOptionalText(body.hireDate),
  hourlyRate: Number(body.hourlyRate) || 0,
  position: normalizeOptionalText(body.position),
  workShift: normalizeOptionalText(body.workShift),
  accountId: Number(body.accountId),
})

const validateEmployeePayload = (payload, requireAccount = false) => {
  if (!payload.fullName) return 'Vui long nhap ho ten nhan vien'
  if (payload.fullName.length > 100) return 'Ho ten khong duoc vuot qua 100 ky tu'
  if (payload.phoneNumber && !phonePattern.test(payload.phoneNumber)) return 'So dien thoai khong hop le'
  if (!isValidDate(payload.birthDate)) return 'Ngay sinh khong hop le'
  if (!isValidDate(payload.hireDate)) return 'Ngay vao lam khong hop le'
  if (payload.identityNumber && !/^[0-9]{9,12}$/.test(payload.identityNumber)) return 'CCCD/CMND khong hop le'
  if (payload.hourlyRate < 0) return 'Luong theo gio khong hop le'
  if (requireAccount && !payload.accountId) return 'Vui long chon tai khoan'
  return null
}

const getEmployees = async (req, res) => {
  try {
    const keyword = normalizeText(req.query.keyword).slice(0, 100)
    const employees = await employeeModel.getEmployees(keyword)
    return res.json({ employees })
  } catch (error) {
    logEmployeeError('get employees', error)
    return res.status(500).json({ message: 'Loi server khi tai nhan vien', error: error.message })
  }
}

const getAssignableAccounts = async (req, res) => {
  try {
    const employeeId = Number(req.query.employeeId)
    const accounts = await employeeModel.getAssignableAccounts(employeeId)
    return res.json({ accounts })
  } catch (error) {
    logEmployeeError('get assignable accounts', error)
    return res.status(500).json({ message: 'Loi server khi tai tai khoan kha dung', error: error.message })
  }
}

const createEmployee = async (req, res) => {
  try {
    const payload = buildEmployeePayload(req.body || {})
    const validationMessage = validateEmployeePayload(payload, true)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const account = await userModel.findById(payload.accountId)
    if (!account) return res.status(400).json({ message: 'Tai khoan khong hop le' })

    const existingEmployee = await employeeModel.findByAccountId(payload.accountId)
    if (existingEmployee) return res.status(409).json({ message: 'Tai khoan nay da duoc gan cho nhan vien khac' })

    const employee = await employeeModel.createEmployee(payload)
    return res.status(201).json({ message: 'Them nhan vien thanh cong', employee })
  } catch (error) {
    logEmployeeError('create employee', error)
    return res.status(500).json({ message: 'Loi server khi them nhan vien', error: error.message })
  }
}

const updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildEmployeePayload(req.body || {})
    const validationMessage = validateEmployeePayload(payload)

    if (!id) return res.status(400).json({ message: 'Nhan vien khong hop le' })
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const employee = await employeeModel.findById(id)
    if (!employee) return res.status(404).json({ message: 'Khong tim thay nhan vien' })

    const updatedEmployee = await employeeModel.updateEmployee(id, payload)
    return res.json({ message: 'Cap nhat nhan vien thanh cong', employee: updatedEmployee })
  } catch (error) {
    logEmployeeError('update employee', error)
    return res.status(500).json({ message: 'Loi server khi cap nhat nhan vien', error: error.message })
  }
}

const deleteEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Nhan vien khong hop le' })

    const employee = await employeeModel.findById(id)
    if (!employee) return res.status(404).json({ message: 'Khong tim thay nhan vien' })

    await employeeModel.deleteEmployee(id)
    return res.json({ message: 'Xoa nhan vien thanh cong' })
  } catch (error) {
    logEmployeeError('delete employee', error)
    return res.status(500).json({ message: 'Loi server khi xoa nhan vien', error: error.message })
  }
}

const updateEmployeeAccountStatus = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const status = getStatusValue((req.body || {}).status)

    if (!id) return res.status(400).json({ message: 'Nhan vien khong hop le' })
    if (status === null) return res.status(400).json({ message: 'Trang thai khong hop le' })

    const employee = await employeeModel.findById(id)
    if (!employee) return res.status(404).json({ message: 'Khong tim thay nhan vien' })

    await employeeModel.updateAccountStatus(employee.accountId, status)
    const updatedEmployee = await employeeModel.findById(id)
    return res.json({ message: status === 1 ? 'Mo khoa tai khoan nhan vien thanh cong' : 'Khoa tai khoan nhan vien thanh cong', employee: updatedEmployee })
  } catch (error) {
    logEmployeeError('update account status', error)
    return res.status(500).json({ message: 'Loi server khi cap nhat trang thai tai khoan', error: error.message })
  }
}

const buildShiftTemplatePayload = (body) => ({
  name: normalizeText(body.name),
  startTime: normalizeText(body.startTime),
  endTime: normalizeText(body.endTime),
  status: normalizeText(body.status) || 'Active',
})

const validateShiftTemplate = (payload) => {
  if (!payload.name) return 'Vui long nhap ten ca'
  if (!isValidTime(payload.startTime) || !isValidTime(payload.endTime)) return 'Gio bat dau/ket thuc khong hop le'
  if (!['Active', 'Inactive'].includes(payload.status)) return 'Trang thai ca khong hop le'
  return null
}

const getShiftTemplates = async (req, res) => {
  try {
    const shiftTemplates = await employeeModel.getShiftTemplates()
    return res.json({ shiftTemplates })
  } catch (error) {
    logEmployeeError('get shift templates', error)
    return res.status(500).json({ message: 'Loi server khi tai ca lam', error: error.message })
  }
}

const createShiftTemplate = async (req, res) => {
  try {
    const payload = buildShiftTemplatePayload(req.body || {})
    const validationMessage = validateShiftTemplate(payload)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const shiftTemplate = await employeeModel.createShiftTemplate(payload)
    return res.status(201).json({ message: 'Da tao ca lam', shiftTemplate })
  } catch (error) {
    logEmployeeError('create shift template', error)
    return res.status(500).json({ message: 'Loi server khi tao ca lam', error: error.message })
  }
}

const updateShiftTemplate = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildShiftTemplatePayload(req.body || {})
    const validationMessage = validateShiftTemplate(payload)
    if (!id) return res.status(400).json({ message: 'Ca lam khong hop le' })
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const shiftTemplate = await employeeModel.updateShiftTemplate(id, payload)
    return res.json({ message: 'Da cap nhat ca lam', shiftTemplate })
  } catch (error) {
    logEmployeeError('update shift template', error)
    return res.status(500).json({ message: 'Loi server khi cap nhat ca lam', error: error.message })
  }
}

const deleteShiftTemplate = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Ca lam khong hop le' })
    await employeeModel.deleteShiftTemplate(id)
    return res.json({ message: 'Da xoa ca lam' })
  } catch (error) {
    logEmployeeError('delete shift template', error)
    return res.status(500).json({ message: 'Khong the xoa ca dang duoc phan cong', error: error.message })
  }
}

const buildAssignmentPayload = (body) => ({
  employeeId: Number(body.employeeId),
  shiftTemplateId: Number(body.shiftTemplateId),
  workDate: normalizeOptionalText(body.workDate),
  note: normalizeOptionalText(body.note),
})

const validateAssignment = (payload) => {
  if (!payload.employeeId) return 'Vui long chon nhan vien'
  if (!payload.shiftTemplateId) return 'Vui long chon ca lam'
  if (!payload.workDate || !isValidDate(payload.workDate)) return 'Ngay lam viec khong hop le'
  return null
}

const getShiftAssignments = async (req, res) => {
  try {
    const assignments = await employeeModel.getShiftAssignments({
      startDate: normalizeOptionalText(req.query.startDate),
      endDate: normalizeOptionalText(req.query.endDate),
    })
    return res.json({ assignments })
  } catch (error) {
    logEmployeeError('get shift assignments', error)
    return res.status(500).json({ message: 'Loi server khi tai phan ca', error: error.message })
  }
}

const createShiftAssignment = async (req, res) => {
  try {
    const payload = buildAssignmentPayload(req.body || {})
    const validationMessage = validateAssignment(payload)
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const assignment = await employeeModel.createShiftAssignment(payload)
    return res.status(201).json({ message: 'Da phan ca', assignment })
  } catch (error) {
    logEmployeeError('create shift assignment', error)
    return res.status(500).json({ message: 'Loi server khi phan ca', error: error.message })
  }
}

const updateShiftAssignment = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payload = buildAssignmentPayload(req.body || {})
    const validationMessage = validateAssignment(payload)
    if (!id) return res.status(400).json({ message: 'Phan ca khong hop le' })
    if (validationMessage) return res.status(400).json({ message: validationMessage })

    const assignment = await employeeModel.updateShiftAssignment(id, payload)
    return res.json({ message: 'Da cap nhat phan ca', assignment })
  } catch (error) {
    logEmployeeError('update shift assignment', error)
    return res.status(500).json({ message: 'Loi server khi cap nhat phan ca', error: error.message })
  }
}

const deleteShiftAssignment = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Phan ca khong hop le' })
    await employeeModel.deleteShiftAssignment(id)
    return res.json({ message: 'Da xoa phan ca' })
  } catch (error) {
    logEmployeeError('delete shift assignment', error)
    return res.status(500).json({ message: 'Loi server khi xoa phan ca', error: error.message })
  }
}

const getAttendance = async (req, res) => {
  try {
    const attendance = await employeeModel.getAttendance({
      startDate: normalizeOptionalText(req.query.startDate),
      endDate: normalizeOptionalText(req.query.endDate),
    })
    return res.json({ attendance })
  } catch (error) {
    logEmployeeError('get attendance', error)
    return res.status(500).json({ message: 'Loi server khi tai cham cong', error: error.message })
  }
}

const updateAttendance = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const loginAt = normalizeText(req.body.loginAt)
    const logoutAt = normalizeOptionalText(req.body.logoutAt)
    const workDate = normalizeText(req.body.workDate)
    const totalHours = Number(req.body.totalHours) || 0

    if (!id) return res.status(400).json({ message: 'Dong cham cong khong hop le' })
    if (!loginAt || !workDate || !isValidDate(workDate) || totalHours < 0) {
      return res.status(400).json({ message: 'Du lieu cham cong khong hop le' })
    }

    const attendance = await employeeModel.updateAttendance(id, { loginAt, logoutAt, workDate, totalHours })
    return res.json({ message: 'Da cap nhat cham cong', attendance })
  } catch (error) {
    logEmployeeError('update attendance', error)
    return res.status(500).json({ message: 'Loi server khi cap nhat cham cong', error: error.message })
  }
}

const getPayroll = async (req, res) => {
  try {
    const month = normalizeText(req.query.month) || new Date().toISOString().slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Thang luong khong hop le' })

    const payroll = await employeeModel.getPayroll({ month })
    return res.json({ month, payroll })
  } catch (error) {
    logEmployeeError('get payroll', error)
    return res.status(500).json({ message: 'Loi server khi tai bang luong', error: error.message })
  }
}

const updatePayrollPayment = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId)
    const month = normalizeText(req.body.month)
    const status = normalizeText(req.body.status) || 'Paid'

    if (!employeeId || !/^\d{4}-\d{2}$/.test(month) || !['Paid', 'Unpaid'].includes(status)) {
      return res.status(400).json({ message: 'Du lieu thanh toan luong khong hop le' })
    }

    await employeeModel.markPayrollPaid({ employeeId, month, status })
    return res.json({ message: status === 'Paid' ? 'Da danh dau da thanh toan' : 'Da chuyen ve chua thanh toan' })
  } catch (error) {
    logEmployeeError('update payroll payment', error)
    return res.status(500).json({ message: 'Loi server khi cap nhat luong', error: error.message })
  }
}

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

const exportPayrollCsv = async (req, res) => {
  try {
    const month = normalizeText(req.query.month) || new Date().toISOString().slice(0, 7)
    const payroll = await employeeModel.getPayroll({ month })
    const rows = [
      ['Nhan vien', 'Chuc vu', 'Tong gio', 'Luong/gio', 'Luong thang', 'Trang thai'],
      ...payroll.map((item) => [
        item.employeeName,
        item.position || '',
        item.totalHours,
        item.hourlyRate,
        item.salary,
        item.paymentStatus === 'Paid' ? 'Da thanh toan' : 'Chua thanh toan',
      ]),
    ]

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="bang-luong-${month}.csv"`)
    return res.send(`\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\n')}`)
  } catch (error) {
    logEmployeeError('export payroll csv', error)
    return res.status(500).json({ message: 'Loi server khi xuat Excel', error: error.message })
  }
}

const buildSimplePdf = (title, lines) => {
  const escapePdfText = (value) => String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const textLines = [title, '', ...lines].map(escapePdfText)
  const content = ['BT', '/F1 12 Tf', '50 790 Td', '16 TL', ...textLines.map((line, index) => `${index === 0 ? '' : 'T* '}(${line}) Tj`), 'ET'].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf)
}

const exportPayrollPdf = async (req, res) => {
  try {
    const month = normalizeText(req.query.month) || new Date().toISOString().slice(0, 7)
    const payroll = await employeeModel.getPayroll({ month })
    const lines = payroll.map((item) => {
      const status = item.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
      return `${item.employeeName} | ${Number(item.totalHours || 0).toFixed(2)}h x ${Number(item.hourlyRate || 0)} = ${Number(item.salary || 0)} VND | ${status}`
    })
    const pdf = buildSimplePdf(`Bang luong thang ${month}`, lines)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="bang-luong-${month}.pdf"`)
    return res.send(pdf)
  } catch (error) {
    logEmployeeError('export payroll pdf', error)
    return res.status(500).json({ message: 'Loi server khi xuat PDF', error: error.message })
  }
}

module.exports = {
  getEmployees,
  getAssignableAccounts,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeAccountStatus,
  getShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  getShiftAssignments,
  createShiftAssignment,
  updateShiftAssignment,
  deleteShiftAssignment,
  getAttendance,
  updateAttendance,
  getPayroll,
  updatePayrollPayment,
  exportPayrollCsv,
  exportPayrollPdf,
}
