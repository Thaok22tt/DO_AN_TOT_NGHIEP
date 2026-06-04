const fs = require('fs')
const path = require('path')
const multer = require('multer')

const productUploadDir = path.join(__dirname, '..', 'uploads', 'products')

fs.mkdirSync(productUploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, productUploadDir)
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`

    callback(null, uniqueName)
  },
})

const fileFilter = (_req, file, callback) => {
  const allowedTypes = ['image/jpeg', 'image/png']

  if (!allowedTypes.includes(file.mimetype)) {
    callback(new Error('Ảnh món chỉ hỗ trợ định dạng jpg hoặc png'))
    return
  }

  callback(null, true)
}

const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

module.exports = uploadProductImage
