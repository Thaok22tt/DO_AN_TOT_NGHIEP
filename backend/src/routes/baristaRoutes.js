const express = require('express')
const baristaController = require('../controllers/baristaController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)

router.get('/workspace', baristaController.getWorkspace)
router.get('/history', baristaController.getHistory)
router.get('/orders', baristaController.getOrders)
router.get('/orders/:id', baristaController.getOrderById)
router.patch('/orders/:id/accept', baristaController.acceptOrder)
router.patch('/orders/:id/status', baristaController.updateOrderStatus)
router.patch('/orders/:id/complete', baristaController.completeOrder)
router.patch('/orders/:id/reject', baristaController.rejectOrder)

module.exports = router
