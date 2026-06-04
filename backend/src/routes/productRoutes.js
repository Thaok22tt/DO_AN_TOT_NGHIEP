const express = require('express')
const accountController = require('../controllers/accountController')
const productController = require('../controllers/productController')
const verifyToken = require('../middleware/authMiddleware')
const uploadProductImage = require('../middleware/uploadProductImage')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

const uploadImage = uploadProductImage.single('image')

const handleUpload = (req, res, next) => {
  uploadImage(req, res, (error) => {
    if (!error) {
      next()
      return
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Ảnh món không được vượt quá 5MB' })
      return
    }

    res.status(400).json({ message: error.message || 'Ảnh món không hợp lệ' })
  })
}

router.get('/', productController.getProducts)
router.post('/', handleUpload, productController.createProduct)
router.put('/:id', handleUpload, productController.updateProduct)
router.delete('/:id', productController.deleteProduct)

module.exports = router
