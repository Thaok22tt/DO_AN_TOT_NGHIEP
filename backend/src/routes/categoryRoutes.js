const express = require('express')
const accountController = require('../controllers/accountController')
const categoryController = require('../controllers/categoryController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/', categoryController.getCategories)
router.post('/', categoryController.createCategory)
router.put('/:id', categoryController.updateCategory)
router.delete('/:id', categoryController.deleteCategory)

module.exports = router
