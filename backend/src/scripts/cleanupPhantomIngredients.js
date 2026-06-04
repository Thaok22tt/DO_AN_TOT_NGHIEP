// Xóa tất cả nguyên liệu phantom: tồn kho = 0, giá = 0, không có phiếu nhập
require('dotenv').config()
const db = require('../config/database')
const conn = db.promise()

async function run() {
  console.log('🧹 Dọn dẹp nguyên liệu phantom...\n')

  // Tìm tất cả nguyên liệu có stock=0, price=0, không có trong bất kỳ phiếu nhập nào
  const [candidates] = await conn.query(`
    SELECT i.IngredientId AS id, i.IngredientName AS name
    FROM ingredients i
    WHERE i.CurrentStock = 0
      AND i.CostPrice = 0
      AND i.Status = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM stock_receipt_details d WHERE d.IngredientId = i.IngredientId
      )
    ORDER BY i.IngredientId DESC
  `)

  if (candidates.length === 0) {
    console.log('  ✅ Không có nguyên liệu phantom nào.')
    process.exit(0)
  }

  console.log(`  Tìm thấy ${candidates.length} nguyên liệu phantom:\n`)
  candidates.forEach(c => console.log(`    - [${c.id}] ${c.name}`))
  console.log()

  for (const { id, name } of candidates) {
    const [recipeResult] = await conn.query('DELETE FROM product_recipes WHERE IngredientId = ?', [id])
    await conn.query('DELETE FROM ingredients WHERE IngredientId = ?', [id])
    console.log(`  ✅ Đã xóa: "${name}" (${recipeResult.affectedRows} công thức liên quan)`)
  }

  console.log('\n✨ Xong! Hãy chạy lại: npm run seed:recipes')
  process.exit(0)
}

run().catch((err) => { console.error('❌', err.message); process.exit(1) })
