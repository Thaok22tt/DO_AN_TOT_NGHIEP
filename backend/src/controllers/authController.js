const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const getRoleRoute = (role = '') => {
  const normalizedRole = String(role).toLowerCase()

  if (normalizedRole === 'admin') return 'admin'
  if (normalizedRole.includes('pha')) return 'barista'
  return 'staff'
}

const login = async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')

    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng cung cấp username/email và mật khẩu' })
    }

    const user = await userModel.findByLogin(username)

    if (!user) {
      return res.status(401).json({ message: 'Username/email không tồn tại' })
    }

    if (user.status === 0) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mật khẩu không đúng' })
    }

    const shift = await userModel.openWorkShift(user.id)
    const shiftAssignment =
      (await userModel.findTodayShiftAssignmentByAccountId(user.id)) ||
      (await userModel.findEmployeeShiftByAccountId(user.id))

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        username: user.username,
      },
      process.env.JWT_SECRET || 'quan-ly-quan-ca-phe-secret',
      { expiresIn: '1d' },
    )

    return res.json({
      message: 'Đăng nhập thành công',
      redirectTo: getRoleRoute(user.role),
      token,
      user: {
        fullName: user.full_name,
        id: user.id,
        isOnShift: true,
        role: user.role,
        shiftAssignment,
        shiftLoginAt: shift?.loginAt || null,
        workShiftId: shift?.id || null,
        username: user.username,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi đăng nhập', error: error.message })
  }
}

const logout = async (req, res) => {
  try {
    const shift = await userModel.closeWorkShift(req.user.id)

    return res.json({
      message: 'Đã đăng xuất và ghi nhận kết thúc ca',
      shift,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi đăng xuất', error: error.message })
  }
}

const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    const shift = await userModel.openWorkShift(req.user.id)
    const shiftAssignment =
      (await userModel.findTodayShiftAssignmentByAccountId(req.user.id)) ||
      (await userModel.findEmployeeShiftByAccountId(req.user.id))

    return res.json({
      user: {
        ...user,
        isOnShift: true,
        shiftAssignment,
        shiftLoginAt: shift?.loginAt || null,
        workShiftId: shift?.id || null,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi tải thông tin cá nhân', error: error.message })
  }
}

const updateProfile = async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim()
    const email = String(req.body?.email || '').trim()
    const phoneNumber = String(req.body?.phoneNumber || '').trim()

    if (!fullName) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên' })
    }

    const user = await userModel.updateProfile(req.user.id, {
      email,
      fullName,
      phoneNumber,
    })

    return res.json({ message: 'Đã cập nhật hồ sơ cá nhân', user })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email đã tồn tại' })
    }

    return res.status(500).json({ message: 'Lỗi server khi cập nhật hồ sơ', error: error.message })
  }
}

const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '')
    const newPassword = String(req.body?.newPassword || '')

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    }

    const user = await userModel.findAuthById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await userModel.resetPassword(req.user.id, hashedPassword)

    return res.json({ message: 'Đã đổi mật khẩu' })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu', error: error.message })
  }
}

module.exports = {
  changePassword,
  getMe,
  login,
  logout,
  updateProfile,
}
