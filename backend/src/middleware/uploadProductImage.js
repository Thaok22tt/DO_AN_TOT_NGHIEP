const multer = require('multer')
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png'],
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
  limits: { fileSize: 5 * 1024 * 1024 },
})

module.exports = uploadProductImage
