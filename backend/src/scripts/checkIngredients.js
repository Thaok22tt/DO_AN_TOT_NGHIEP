require('dotenv').config()
const db = require('../config/database')
const conn = db.promise()

async function run() {
  const [rows] = await conn.query(`
    SELECT i.IngredientId AS id, i.IngredientName AS name, i.Unit AS unit,
           i.CurrentStock AS stock, i.CostPrice AS price, i.Status AS status,
           c.CategoryName AS category
    FROM ingredients i
    LEFT JOIN ingredient_categories c ON c.IngredientCategoryId = i.CategoryId
    ORDER BY i.IngredientId ASC
  `)
  console.log(`\nHiện còn ${rows.length} nguyên liệu trong DB:\n`)
  rows.forEach(r => console.log(`  [${r.id}] ${r.name} | ${r.category || 'Chưa phân loại'} | ${r.unit} | stock=${r.stock} | price=${r.price} | ${r.status}`))

  // Tự động kích hoạt lại nguyên liệu Inactive có tồn kho > 0
  const toActivate = rows.filter(r => r.status === 'Inactive' && Number(r.stock) > 0)
  if (toActivate.length > 0) {
    console.log(`\n🔧 Tự kích hoạt ${toActivate.length} nguyên liệu Inactive có tồn kho:`)
    for (const r of toActivate) {
      await conn.query("UPDATE ingredients SET Status = 'Active' WHERE IngredientId = ?", [r.id])
      console.log(`  ✅ [${r.id}] ${r.name}`)
    }
  }

  process.exit(0)
}
run().catch(e => { console.error(e.message); process.exit(1) })
