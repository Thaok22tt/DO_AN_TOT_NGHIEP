const express = require('express')
const accountController = require('../controllers/accountController')
const promotionController = require('../controllers/promotionController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/', promotionController.getPromotions)
router.post('/', promotionController.createPromotion)
router.put('/:id', promotionController.updatePromotion)
router.delete('/:id', promotionController.deletePromotion)

module.exports = router
