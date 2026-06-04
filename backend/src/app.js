const express = require('express')
const cors = require('cors')
const path = require('path')
const accountRoutes = require('./routes/accountRoutes')
const areaRoutes = require('./routes/areaRoutes')
const authRoutes = require('./routes/authRoutes')
const baristaRoutes = require('./routes/baristaRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const employeeRoutes = require('./routes/employeeRoutes')
const invoiceRoutes = require('./routes/invoiceRoutes')
const inventoryRoutes = require('./routes/inventoryRoutes')
const productRoutes = require('./routes/productRoutes')
const promotionRoutes = require('./routes/promotionRoutes')
const workstationRoutes = require('./routes/workstationRoutes')
const financialRoutes = require('./routes/financialRoutes')
const revenueRoutes = require('./routes/revenueRoutes')
const tableRoutes = require('./routes/tableRoutes')

require('./config/database')

const app = express()

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req, res) => {
  res.json({ message: 'Backend Running...' })
})

app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/areas', areaRoutes)
app.use('/api/barista', baristaRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/promotions', promotionRoutes)
app.use('/api/workstation', workstationRoutes)
app.use('/api/financial', financialRoutes)
app.use('/api/revenue', revenueRoutes)
app.use('/api/tables', tableRoutes)

module.exports = app
