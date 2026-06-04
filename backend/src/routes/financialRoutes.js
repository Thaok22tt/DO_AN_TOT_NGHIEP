const express = require('express')
const accountController = require('../controllers/accountController')
const financialController = require('../controllers/financialController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/monthly', financialController.getMonthlyFinancialReport)

module.exports = router
