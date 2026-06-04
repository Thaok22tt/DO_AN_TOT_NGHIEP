const express = require('express')
const accountController = require('../controllers/accountController')
const tableController = require('../controllers/tableController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/', tableController.getTables)
router.post('/', tableController.createTable)
router.put('/:id', tableController.updateTable)
router.delete('/:id', tableController.deleteTable)

module.exports = router
