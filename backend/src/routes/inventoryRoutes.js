const express = require('express')
const accountController = require('../controllers/accountController')
const inventoryController = require('../controllers/inventoryController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/bootstrap', inventoryController.getBootstrap)
router.post('/categories', inventoryController.createCategory)
router.put('/categories/:id', inventoryController.updateCategory)
router.delete('/categories/:id', inventoryController.deleteCategory)
router.post('/suppliers', inventoryController.createSupplier)
router.put('/suppliers/:id', inventoryController.updateSupplier)
router.post('/ingredients', inventoryController.createIngredient)
router.put('/ingredients/:id', inventoryController.updateIngredient)
router.patch('/ingredients/:id/stock', inventoryController.adjustIngredientStock)
router.post('/receipts', inventoryController.createReceipt)
router.put('/recipes/:productId', inventoryController.replaceRecipe)

module.exports = router
