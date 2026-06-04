const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Chua cung cap token' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'quan-ly-quan-ca-phe-secret')
    return next()
  } catch (error) {
    return res.status(403).json({ message: 'Token khong hop le' })
  }
}

module.exports = verifyToken
