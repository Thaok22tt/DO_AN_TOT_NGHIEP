const multer = require('multer')
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, _file) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    return {
      folder: 'products',
      allowed_formats: ['jpg', 'jpeg', 'png'],
    }
  },
})

const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

module.exports = uploadProductImage
