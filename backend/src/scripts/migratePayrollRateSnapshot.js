require('dotenv').config()
const db = require('../config/database')

async function run() {
  // Kiểm tra cột đã tồn tại chưa
  const [cols] = await db.promise().query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_payments' AND COLUMN_NAME = 'HourlyRate'"
  )
  if (cols.length > 0) {
    console.log('ℹ️  Cột HourlyRate đã tồn tại, bỏ qua.')
    process.exit(0)
  }
  await db.promise().query(
    'ALTER TABLE payroll_payments ADD COLUMN HourlyRate DECIMAL(12, 0) NULL DEFAULT NULL'
  )
  console.log('✅ Đã thêm cột HourlyRate vào payroll_payments')
  process.exit(0)
}

run().catch((err) => { console.error('❌', err.message); process.exit(1) })
