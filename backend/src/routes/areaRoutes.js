const express = require('express')
const accountController = require('../controllers/accountController')
const areaController = require('../controllers/areaController')
const verifyToken = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)
router.use(accountController.requireAdmin)

router.get('/', areaController.getAreas)
router.post('/', areaController.createArea)
router.put('/:id', areaController.updateArea)
router.delete('/:id', areaController.deleteArea)

module.exports = router
