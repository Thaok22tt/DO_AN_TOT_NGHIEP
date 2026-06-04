require('dotenv').config()
const db = require('../config/database')
const conn = db.promise()

// ── Ánh xạ tên nguyên liệu trong công thức → tên trong DB ──
const NAME_MAP = {
  // Các tên dùng chính xác tên trong DB nên không cần map nhiều
  'Đường': 'Đường cát', // shorthand fallback nếu có
}

// ── Nguyên liệu tự tạo nếu chưa có trong DB ──
const AUTO_CREATE = {
  'Bột socola':    { unit: 'gram', minStock: 200, category: 'Cacao' },
  'Bột khoai môn': { unit: 'gram', minStock: 200, category: null },
  'Bột matcha':    { unit: 'gram', minStock: 200, category: null },
}

// ── Toàn bộ công thức ──
const RECIPES = [
  // ─────── Nhóm Cacao ───────
  { product: 'Cacao', ingredients: [
    { name: 'Bột cacao', qty: 20 }, { name: 'Sữa đặc', qty: 25 }, { name: 'Sữa tươi không đường', qty: 80 }, { name: 'Đường cát', qty: 15 },
  ]},
  { product: 'Cacao cốt dừa', ingredients: [
    { name: 'Bột cacao', qty: 20 }, { name: 'Cốt dừa', qty: 50 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},

  // ─────── Nhóm Cà phê ───────
  { product: 'Cà phê cốt dừa', ingredients: [
    { name: 'Cà phê bột', qty: 25 }, { name: 'Cốt dừa', qty: 50 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Cà phê đen', ingredients: [
    { name: 'Cà phê bột', qty: 25 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Cà phê kem trứng', ingredients: [
    { name: 'Cà phê bột', qty: 25 }, { name: 'Trứng gà', qty: 1 }, { name: 'Kem béo Rich\'s', qty: 20 }, { name: 'Sữa đặc', qty: 15 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Cà phê muối', ingredients: [
    { name: 'Cà phê bột', qty: 25 }, { name: 'Kem béo Rich\'s', qty: 20 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Muối', qty: 1 }, { name: 'Đường cát', qty: 5 },
  ]},
  { product: 'Cà phê sữa', ingredients: [
    { name: 'Cà phê bột', qty: 25 }, { name: 'Sữa đặc', qty: 30 }, { name: 'Đường cát', qty: 5 },
  ]},
  { product: 'Cà phê phin', ingredients: [
    { name: 'Cà phê bột', qty: 25 }, { name: 'Đường cát', qty: 10 },
  ]},

  // ─────── Nhóm Trà sữa ───────
  { product: 'Sữa tươi trân châu đường đen', ingredients: [
    { name: 'Sữa tươi không đường', qty: 180 }, { name: 'Trân châu đen', qty: 50 }, { name: 'Đường đen', qty: 20 },
  ]},
  { product: 'Trà sữa trân châu đường đen', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Trân châu đen', qty: 50 }, { name: 'Đường đen', qty: 20 },
  ]},
  { product: 'Trà sữa thái xanh', ingredients: [
    { name: 'Trà thái xanh', qty: 12 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà sữa thái đỏ', ingredients: [
    { name: 'Trà thái đỏ', qty: 12 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà sữa socola', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Bột socola', qty: 20 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà sữa khoai môn', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Bột khoai môn', qty: 20 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà sữa gạo rang', ingredients: [
    { name: 'Trà gạo rang', qty: 12 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà sữa dâu', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Syrup dâu', qty: 20 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 15 },
  ]},
  { product: 'Trà sữa truyền thống', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Bột kem sữa', qty: 25 }, { name: 'Đường cát', qty: 20 },
  ]},

  // ─────── Nhóm Matcha - Đá xay ───────
  { product: 'Socola đá xay', ingredients: [
    { name: 'Bột socola', qty: 25 }, { name: 'Sữa tươi không đường', qty: 120 }, { name: 'Kem béo Rich\'s', qty: 20 }, { name: 'Đường cát', qty: 15 },
  ]},
  { product: 'Matcha đá xay', ingredients: [
    { name: 'Bột matcha', qty: 5 }, { name: 'Sữa tươi không đường', qty: 120 }, { name: 'Kem béo Rich\'s', qty: 20 }, { name: 'Đường cát', qty: 15 },
  ]},
  { product: 'Matcha Latte', ingredients: [
    { name: 'Bột matcha', qty: 5 }, { name: 'Sữa tươi không đường', qty: 180 }, { name: 'Đường cát', qty: 15 },
  ]},

  // ─────── Nhóm Nước ép ───────
  { product: 'Nước ép cam',     ingredients: [{ name: 'Cam tươi', qty: 250 }, { name: 'Đường cát', qty: 15 }] },
  { product: 'Nước ép dứa',     ingredients: [{ name: 'Dứa',      qty: 250 }, { name: 'Đường cát', qty: 15 }] },
  { product: 'Nước ép dưa hấu', ingredients: [{ name: 'Dưa hấu',  qty: 300 }, { name: 'Đường cát', qty: 10 }] },
  { product: 'Nước ép lựu',     ingredients: [{ name: 'Lựu',      qty: 250 }, { name: 'Đường cát', qty: 15 }] },
  { product: 'Nước ép cà rốt',  ingredients: [{ name: 'Cà rốt',   qty: 250 }, { name: 'Đường cát', qty: 15 }] },
  { product: 'Nước ép táo',     ingredients: [{ name: 'Táo',      qty: 250 }, { name: 'Đường cát', qty: 15 }] },

  // ─────── Nhóm Sinh tố ───────
  { product: 'Sinh tố dâu', ingredients: [
    { name: 'Dâu tây', qty: 150 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Sinh tố xoài', ingredients: [
    { name: 'Xoài', qty: 180 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Sinh tố việt quất', ingredients: [
    { name: 'Việt quất', qty: 120 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},

  // ─────── Nhóm Trà trái cây ───────
  { product: 'Trà tắc', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Tắc', qty: 30 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà tắc thái xanh', ingredients: [
    { name: 'Trà thái xanh', qty: 10 }, { name: 'Tắc', qty: 30 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà đào trà gừng', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Đào ngâm', qty: 50 }, { name: 'Gừng', qty: 10 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà dâu', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Syrup dâu', qty: 20 }, { name: 'Đường cát', qty: 15 },
  ]},
  { product: 'Trà mãng cầu', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Mãng cầu', qty: 80 }, { name: 'Đường cát', qty: 20 },
  ]},
  { product: 'Trà đào cam sả', ingredients: [
    { name: 'Trà đen', qty: 10 }, { name: 'Đào ngâm', qty: 50 }, { name: 'Cam tươi', qty: 50 }, { name: 'Sả', qty: 10 }, { name: 'Đường cát', qty: 20 },
  ]},

  // ─────── Nhóm Soda ───────
  { product: 'Soda việt quất', ingredients: [
    { name: 'Soda', qty: 1 }, { name: 'Syrup việt quất', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Soda dâu', ingredients: [
    { name: 'Soda', qty: 1 }, { name: 'Syrup dâu', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Soda chanh', ingredients: [
    { name: 'Soda', qty: 1 }, { name: 'Chanh', qty: 20 }, { name: 'Đường cát', qty: 15 },
  ]},
  { product: 'Soda bạc hà', ingredients: [
    { name: 'Soda', qty: 1 }, { name: 'Syrup bạc hà', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},

  // ─────── Nhóm Yaourt ───────
  { product: 'Yaourt dâu', ingredients: [
    { name: 'Yaourt', qty: 1 }, { name: 'Syrup dâu', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Yaourt đá', ingredients: [
    { name: 'Yaourt', qty: 1 }, { name: 'Sữa đặc', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
  { product: 'Yaourt việt quất', ingredients: [
    { name: 'Yaourt', qty: 1 }, { name: 'Syrup việt quất', qty: 20 }, { name: 'Đường cát', qty: 10 },
  ]},
]

// ── Lấy hoặc tạo ingredient theo tên ──
async function getOrCreateIngredient(recipeName) {
  const dbName = NAME_MAP[recipeName] || recipeName
  const [rows] = await conn.query(
    'SELECT IngredientId AS id FROM ingredients WHERE IngredientName = ? LIMIT 1',
    [dbName]
  )
  if (rows.length > 0) return rows[0].id

  // Thử tìm gần đúng nếu tên đã map nhưng không tìm thấy
  if (NAME_MAP[recipeName]) {
    const [rows2] = await conn.query(
      'SELECT IngredientId AS id FROM ingredients WHERE IngredientName = ? LIMIT 1',
      [recipeName]
    )
    if (rows2.length > 0) return rows2[0].id
  }

  // Tự tạo nguyên liệu thiếu
  const defaults = AUTO_CREATE[recipeName] || { unit: 'gram', minStock: 0, category: null }
  let categoryId = null
  if (defaults.category) {
    const [catRows] = await conn.query(
      "SELECT IngredientCategoryId AS id FROM ingredient_categories WHERE CategoryName = ? AND Status = 'Active' LIMIT 1",
      [defaults.category]
    )
    categoryId = catRows[0]?.id || null
  }

  const [result] = await conn.query(
    "INSERT INTO ingredients (IngredientName, Unit, MinStock, CurrentStock, CostPrice, CategoryId, Status) VALUES (?, ?, ?, 0, 0, ?, 'Active')",
    [dbName, defaults.unit, defaults.minStock, categoryId]
  )
  console.log(`  ➕ Tạo nguyên liệu: ${dbName} (${defaults.unit})`)
  return result.insertId
}

async function run() {
  console.log('🍵 Bắt đầu thêm công thức...\n')

  let saved = 0, skipped = 0

  for (const recipe of RECIPES) {
    // Tìm sản phẩm
    const [products] = await conn.query(
      'SELECT ProductId AS id FROM products WHERE ProductName = ? LIMIT 1',
      [recipe.product]
    )
    if (products.length === 0) {
      console.log(`  ⚠️  Không tìm thấy sản phẩm: "${recipe.product}" — bỏ qua`)
      skipped++
      continue
    }
    const productId = products[0].id

    // Lấy/tạo ingredient IDs
    const items = []
    for (const ing of recipe.ingredients) {
      const ingredientId = await getOrCreateIngredient(ing.name)
      items.push({ ingredientId, quantity: ing.qty })
    }

    // Xoá công thức cũ và lưu mới
    await conn.query('DELETE FROM product_recipes WHERE ProductId = ?', [productId])
    for (const item of items) {
      await conn.query(
        'INSERT INTO product_recipes (ProductId, IngredientId, Quantity) VALUES (?, ?, ?)',
        [productId, item.ingredientId, item.quantity]
      )
    }

    console.log(`  ✅ ${recipe.product} (${items.length} nguyên liệu)`)
    saved++
  }

  console.log(`\n🎉 Hoàn tất! ${saved} công thức đã lưu, ${skipped} bỏ qua (không tìm thấy sản phẩm)`)
  process.exit(0)
}

run().catch((err) => { console.error('❌', err.message); process.exit(1) })
