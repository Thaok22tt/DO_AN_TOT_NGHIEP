const express = require('express')
const accountController = require('../controllers/accountController')
const revenueController = require('../controllers/revenueController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/daily', revenueController.getDailyRevenue)
router.get('/monthly', revenueController.getMonthlyRevenue)
router.get('/yearly', revenueController.getYearlyRevenue)
router.get('/years', revenueController.getYearsRevenue)
router.get('/range', revenueController.getRangeRevenue)

module.exports = router
