require('dotenv').config()
const db = require('../config/database')

async function run() {
  const [cols] = await db.promise().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'invoices'
      AND COLUMN_NAME = 'BaristaAccountId'
  `)

  if (cols.length > 0) {
    console.log('ℹ️  Cột BaristaAccountId đã tồn tại, bỏ qua.')
    process.exit(0)
  }

  await db.promise().query(`
    ALTER TABLE invoices
    ADD COLUMN BaristaAccountId INT NULL DEFAULT NULL
  `)
  console.log('✅ Đã thêm cột BaristaAccountId vào bảng invoices')
  process.exit(0)
}

run().catch((err) => { console.error('❌', err.message); process.exit(1) })
