const express = require('express')
const authController = require('../controllers/authController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/login', authController.login)
router.post('/logout', verifyToken, authController.logout)
router.get('/me', verifyToken, authController.getMe)
router.put('/me', verifyToken, authController.updateProfile)
router.patch('/change-password', verifyToken, authController.changePassword)

module.exports = router
