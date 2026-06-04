const express = require('express')
const accountController = require('../controllers/accountController')
const invoiceController = require('../controllers/invoiceController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/', invoiceController.getInvoices)
router.get('/:id', invoiceController.getInvoiceById)

module.exports = router
