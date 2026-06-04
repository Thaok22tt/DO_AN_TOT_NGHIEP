const bcrypt = require('bcryptjs')
const userModel = require('../models/userModel')

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizeOptionalText = (value) => {
  const text = normalizeText(value)
  return text || null
}

const getStatusValue = (status) => {
  if (status === true || status === 1 || status === '1' || status === 'active') {
    return 1
  }

  if (status === false || status === 0 || status === '0' || status === 'locked') {
    return 0
  }

  return 1
}

const getDuplicateAccountMessage = (error) => {
  if (error.code !== 'ER_DUP_ENTRY') {
    return null
  }

  if (String(error.message).includes('Username')) {
    return 'Tên đăng nhập đã tồn tại'
  }

  if (String(error.message).includes('Email')) {
    return 'Email đã tồn tại'
  }

  return 'Thông tin tài khoản đã tồn tại'
}

const logAccountError = (action, error) => {
  console.error(`[accounts] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' })
  }

  return next()
}

const getRoles = async (req, res) => {
  try {
    const roles = await userModel.getRoles()
    return res.json({ roles })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi tải vai trò', error: error.message })
  }
}

const getAccounts = async (req, res) => {
  try {
    const accounts = await userModel.getAccounts()
    return res.json({ accounts })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi tải tài khoản', error: error.message })
  }
}

const createAccount = async (req, res) => {
  try {
    const body = req.body || {}
    const username = normalizeText(body.username)
    const password = normalizeText(body.password)
    const fullName = normalizeText(body.fullName)
    const email = normalizeOptionalText(body.email)
    const phoneNumber = normalizeOptionalText(body.phoneNumber)
    const roleId = Number(body.roleId)
    const status = getStatusValue(body.status)

    if (!username || !password || !fullName || !roleId) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu, họ tên và vai trò' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    }

    const role = await userModel.findRoleById(roleId)
    if (!role) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' })
    }

    const existingAccount = await userModel.findByUsernameOrEmail(username, email)
    if (existingAccount?.username === username) {
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' })
    }

    if (email && existingAccount?.email === email) {
      return res.status(409).json({ message: 'Email đã tồn tại' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const account = await userModel.createAccount({
      username,
      password: hashedPassword,
      fullName,
      email,
      phoneNumber,
      roleId,
      status,
    })

    return res.status(201).json({ message: 'Thêm tài khoản thành công', account })
  } catch (error) {
    const duplicateMessage = getDuplicateAccountMessage(error)
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage })
    }

    logAccountError('create account', error)
    return res.status(500).json({ message: 'Lỗi server khi thêm tài khoản', error: error.message })
  }
}

const updateAccount = async (req, res) => {
  try {
    const body = req.body || {}
    const id = Number(req.params.id)
    const username = normalizeText(body.username)
    const password = normalizeText(body.password)
    const fullName = normalizeText(body.fullName)
    const email = normalizeOptionalText(body.email)
    const phoneNumber = normalizeOptionalText(body.phoneNumber)
    const roleId = Number(body.roleId)
    const status = getStatusValue(body.status)

    if (!id) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ' })
    }

    if (!username || !fullName || !roleId) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập, họ tên và vai trò' })
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    }

    const account = await userModel.findById(id)
    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    const role = await userModel.findRoleById(roleId)
    if (!role) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' })
    }

    const existingAccount = await userModel.findByUsernameOrEmail(username, email, id)
    if (existingAccount?.username === username) {
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại' })
    }

    if (email && existingAccount?.email === email) {
      return res.status(409).json({ message: 'Email đã tồn tại' })
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined
    const updatedAccount = await userModel.updateAccount(id, {
      username,
      password: hashedPassword,
      fullName,
      email,
      phoneNumber,
      roleId,
      status,
    })

    return res.json({ message: 'Cập nhật tài khoản thành công', account: updatedAccount })
  } catch (error) {
    const duplicateMessage = getDuplicateAccountMessage(error)
    if (duplicateMessage) {
      return res.status(409).json({ message: duplicateMessage })
    }

    logAccountError('update account', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật tài khoản', error: error.message })
  }
}

const updateStatus = async (req, res) => {
  try {
    const body = req.body || {}
    const id = Number(req.params.id)
    const status = getStatusValue(body.status)

    if (!id) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ' })
    }

    const account = await userModel.findById(id)
    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    const updatedAccount = await userModel.updateStatus(id, status)
    const message = status === 1 ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công'

    return res.json({ message, account: updatedAccount })
  } catch (error) {
    logAccountError('update status', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái tài khoản', error: error.message })
  }
}

const updateRole = async (req, res) => {
  try {
    const body = req.body || {}
    const id = Number(req.params.id)
    const roleId = Number(body.roleId)

    if (!id) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ' })
    }

    if (!roleId) {
      return res.status(400).json({ message: 'Vui lòng chọn vai trò' })
    }

    const account = await userModel.findById(id)
    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    const role = await userModel.findRoleById(roleId)
    if (!role) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' })
    }

    const updatedAccount = await userModel.updateRole(id, roleId)

    return res.json({ message: 'Cập nhật phân quyền thành công', account: updatedAccount })
  } catch (error) {
    logAccountError('update role', error)
    return res.status(500).json({ message: 'Lỗi server khi cập nhật phân quyền', error: error.message })
  }
}

const resetPassword = async (req, res) => {
  try {
    const body = req.body || {}
    const id = Number(req.params.id)
    const password = normalizeText(body.password)

    if (!id) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ' })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    }

    const account = await userModel.findById(id)
    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const updatedAccount = await userModel.resetPassword(id, hashedPassword)

    return res.json({ message: 'Reset mật khẩu thành công', account: updatedAccount })
  } catch (error) {
    logAccountError('reset password', error)
    return res.status(500).json({ message: 'Lỗi server khi reset mật khẩu', error: error.message })
  }
}

const deleteAccount = async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!id) {
      return res.status(400).json({ message: 'Tài khoản không hợp lệ' })
    }

    const account = await userModel.findById(id)
    if (!account) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    await userModel.deleteAccount(id)

    return res.json({ message: 'Xóa tài khoản thành công' })
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message: 'Không thể xóa tài khoản vì đang có dữ liệu liên quan trong hệ thống',
      })
    }

    logAccountError('delete account', error)
    return res.status(500).json({ message: 'Lỗi server khi xóa tài khoản', error: error.message })
  }
}

module.exports = {
  requireAdmin,
  getRoles,
  getAccounts,
  createAccount,
  updateAccount,
  updateRole,
  updateStatus,
  resetPassword,
  deleteAccount,
}
