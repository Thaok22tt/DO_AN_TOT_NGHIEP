const multer = require('multer')

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Chỉ chấp nhận ảnh jpg, jpeg, png'))
  },
})

module.exports = uploadProductImage
