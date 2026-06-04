require('dotenv').config()
const db = require('../config/database')

async function run() {
  const [cols] = await db.promise().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'promotions'
      AND COLUMN_NAME = 'PromotionCode'
  `)

  if (cols.length > 0) {
    console.log('ℹ️  Cột PromotionCode đã tồn tại, bỏ qua.')
    process.exit(0)
  }

  await db.promise().query(`
    ALTER TABLE promotions
    ADD COLUMN PromotionCode VARCHAR(50) NULL DEFAULT NULL UNIQUE
  `)
  console.log('✅ Đã thêm cột PromotionCode vào bảng promotions')
  process.exit(0)
}

run().catch((err) => { console.error('❌', err.message); process.exit(1) })
