const express = require('express')
const accountController = require('../controllers/accountController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/roles', accountController.getRoles)
router.get('/', accountController.getAccounts)
router.post('/', accountController.createAccount)
router.put('/:id', accountController.updateAccount)
router.patch('/:id/role', accountController.updateRole)
router.patch('/:id/status', accountController.updateStatus)
router.patch('/:id/password', accountController.resetPassword)
router.delete('/:id', accountController.deleteAccount)

module.exports = router
