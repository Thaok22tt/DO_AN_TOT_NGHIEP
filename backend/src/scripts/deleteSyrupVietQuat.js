require('dotenv').config()
const db = require('../config/database')
const conn = db.promise()

async function run() {
  const name = 'Syrup việt quất'

  // Tìm tất cả record trùng tên (kể cả unicode khác nhau)
  const [rows] = await conn.query(
    "SELECT IngredientId AS id, IngredientName AS name, Unit AS unit, CurrentStock AS stock, CostPrice AS price FROM ingredients WHERE IngredientName LIKE 'Syrup vi%t qu%t'"
  )

  if (rows.length === 0) {
    console.log('Không tìm thấy "Syrup việt quất" trong DB.')
    process.exit(0)
  }

  for (const row of rows) {
    console.log(`Xóa: [${row.id}] ${row.name} | ${row.unit} | stock=${row.stock} | price=${row.price}`)
    await conn.query('DELETE FROM product_recipes WHERE IngredientId = ?', [row.id])
    await conn.query('DELETE FROM stock_receipt_details WHERE IngredientId = ?', [row.id])
    await conn.query('DELETE FROM stock_movements WHERE IngredientId = ?', [row.id])
    await conn.query('DELETE FROM ingredients WHERE IngredientId = ?', [row.id])
  }

  console.log('✅ Xóa xong. Bạn có thể nhập lại "Syrup việt quất" đúng qua phiếu nhập kho.')
  process.exit(0)
}

run().catch(e => { console.error('❌', e.message); process.exit(1) })
