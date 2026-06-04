const db = require('../config/database')

const connection = db.promise()

const supplierSelect = `
  SELECT
    SupplierId AS id,
    SupplierName AS name,
    Phone AS phone,
    Email AS email,
    Address AS address,
    Status AS status,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM suppliers
`

const categorySelect = `
  SELECT
    IngredientCategoryId AS id,
    CategoryName AS name,
    Description AS description,
    Status AS status,
    CreatedAt AS createdAt,
    UpdatedAt AS updatedAt
  FROM ingredient_categories
`

const ingredientSelect = `
  SELECT
    i.IngredientId AS id,
    i.IngredientName AS name,
    i.Unit AS unit,
    i.MinStock AS minStock,
    i.CurrentStock AS currentStock,
    i.CostPrice AS costPrice,
    i.CategoryId AS categoryId,
    c.CategoryName AS categoryName,
    i.SupplierId AS supplierId,
    s.SupplierName AS supplierName,
    i.Status AS status,
    i.CreatedAt AS createdAt,
    i.UpdatedAt AS updatedAt
  FROM ingredients i
  LEFT JOIN ingredient_categories c ON c.IngredientCategoryId = i.CategoryId
  LEFT JOIN suppliers s ON s.SupplierId = i.SupplierId
`

const receiptSelect = `
  SELECT
    r.StockReceiptId AS id,
    r.ReceiptCode AS code,
    r.SupplierId AS supplierId,
    s.SupplierName AS supplierName,
    r.AccountId AS accountId,
    acc.FullName AS employeeName,
    r.TotalAmount AS totalAmount,
    r.Note AS note,
    r.CreatedAt AS createdAt
  FROM stock_receipts r
  LEFT JOIN suppliers s ON s.SupplierId = r.SupplierId
  LEFT JOIN accounts acc ON acc.AccountId = r.AccountId
`

const buildReceiptCode = () => `NK${Date.now()}`

const getSuppliers = () => connection.query(`${supplierSelect} ORDER BY SupplierId DESC`).then(([rows]) => rows)

const findSupplierById = (id) => connection.query(`${supplierSelect} WHERE SupplierId = ? LIMIT 1`, [id]).then(([rows]) => rows[0])

const getIngredientCategories = () =>
  connection.query(`${categorySelect} WHERE Status = 'Active' ORDER BY IngredientCategoryId DESC`).then(([rows]) => rows)

const findIngredientCategoryById = (id) =>
  connection.query(`${categorySelect} WHERE IngredientCategoryId = ? LIMIT 1`, [id]).then(([rows]) => rows[0])

const findInactiveCategoryByName = (name) =>
  connection.query(`${categorySelect} WHERE CategoryName = ? AND Status = 'Inactive' LIMIT 1`, [name]).then(([rows]) => rows[0])

const createIngredientCategory = async ({ name, description = null, status = 'Active' }) => {
  const [result] = await connection.query(
    'INSERT INTO ingredient_categories (CategoryName, Description, Status) VALUES (?, ?, ?)',
    [name, description || null, status]
  )

  return findIngredientCategoryById(result.insertId)
}

const updateIngredientCategory = async (id, { name, description = null, status = 'Active' }) => {
  await connection.query(
    'UPDATE ingredient_categories SET CategoryName = ?, Description = ?, Status = ? WHERE IngredientCategoryId = ?',
    [name, description || null, status, id]
  )

  return findIngredientCategoryById(id)
}

const createSupplier = async ({ name, phone = null, email = null, address = null, status = 'Active' }) => {
  const [result] = await connection.query(
    'INSERT INTO suppliers (SupplierName, Phone, Email, Address, Status) VALUES (?, ?, ?, ?, ?)',
    [name, phone || null, email || null, address || null, status]
  )

  return findSupplierById(result.insertId)
}

const updateSupplier = async (id, { name, phone = null, email = null, address = null, status = 'Active' }) => {
  await connection.query(
    'UPDATE suppliers SET SupplierName = ?, Phone = ?, Email = ?, Address = ?, Status = ? WHERE SupplierId = ?',
    [name, phone || null, email || null, address || null, status, id]
  )

  return findSupplierById(id)
}

const getIngredients = () => connection.query(`${ingredientSelect} ORDER BY i.IngredientId DESC`).then(([rows]) => rows)

const findIngredientById = (id) => connection.query(`${ingredientSelect} WHERE i.IngredientId = ? LIMIT 1`, [id]).then(([rows]) => rows[0])

const findIngredientByName = (name) => connection.query(`${ingredientSelect} WHERE i.IngredientName = ? LIMIT 1`, [name]).then(([rows]) => rows[0])

const createIngredient = async ({ name, unit, minStock = 0, currentStock = 0, costPrice = 0, categoryId = null, supplierId = null, status = 'Active' }) => {
  const [result] = await connection.query(
    `
      INSERT INTO ingredients
        (IngredientName, Unit, MinStock, CurrentStock, CostPrice, CategoryId, SupplierId, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [name, unit, minStock, currentStock, costPrice, categoryId || null, supplierId || null, status]
  )

  return findIngredientById(result.insertId)
}

const updateIngredient = async (id, { name, unit, minStock = 0, costPrice = 0, categoryId = null, supplierId = null, status = 'Active' }) => {
  await connection.query(
    `
      UPDATE ingredients
      SET IngredientName = ?,
          Unit = ?,
          MinStock = ?,
          CostPrice = ?,
          CategoryId = ?,
          SupplierId = ?,
          Status = ?
      WHERE IngredientId = ?
    `,
    [name, unit, minStock, costPrice, categoryId || null, supplierId || null, status, id]
  )

  return findIngredientById(id)
}

const adjustIngredientStock = async (id, { quantity, note = null, accountId = null }) => {
  await connection.beginTransaction()

  try {
    const [rows] = await connection.query('SELECT CurrentStock AS currentStock FROM ingredients WHERE IngredientId = ? FOR UPDATE', [id])
    const ingredient = rows[0]
    if (!ingredient) {
      throw new Error('Khong tim thay nguyen lieu')
    }

    const beforeQuantity = Number(ingredient.currentStock || 0)
    const afterQuantity = Number(quantity)
    const changedQuantity = afterQuantity - beforeQuantity

    await connection.query('UPDATE ingredients SET CurrentStock = ? WHERE IngredientId = ?', [afterQuantity, id])
    await connection.query(
      `
        INSERT INTO stock_movements
          (IngredientId, MovementType, Quantity, BeforeQuantity, AfterQuantity, ReferenceType, ReferenceId, Note, AccountId)
        VALUES (?, 'Adjust', ?, ?, ?, 'Adjust', NULL, ?, ?)
      `,
      [id, changedQuantity, beforeQuantity, afterQuantity, note || null, accountId || null]
    )

    await connection.commit()
    return findIngredientById(id)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const getRecipes = () =>
  connection
    .query(
      `
        SELECT
          r.ProductRecipeId AS id,
          r.ProductId AS productId,
          p.ProductName AS productName,
          r.IngredientId AS ingredientId,
          i.IngredientName AS ingredientName,
          i.Unit AS unit,
          r.Quantity AS quantity
        FROM product_recipes r
        INNER JOIN products p ON p.ProductId = r.ProductId
        INNER JOIN ingredients i ON i.IngredientId = r.IngredientId
        ORDER BY p.ProductName ASC, i.IngredientName ASC
      `
    )
    .then(([rows]) => rows)

const getRecipeByProductId = (productId) =>
  connection
    .query(
      `
        SELECT
          r.ProductRecipeId AS id,
          r.ProductId AS productId,
          r.IngredientId AS ingredientId,
          i.IngredientName AS ingredientName,
          i.Unit AS unit,
          r.Quantity AS quantity
        FROM product_recipes r
        INNER JOIN ingredients i ON i.IngredientId = r.IngredientId
        WHERE r.ProductId = ?
        ORDER BY i.IngredientName ASC
      `,
      [productId]
    )
    .then(([rows]) => rows)

const replaceRecipe = async (productId, items = []) => {
  await connection.beginTransaction()

  try {
    await connection.query('DELETE FROM product_recipes WHERE ProductId = ?', [productId])

    for (const item of items) {
      await connection.query('INSERT INTO product_recipes (ProductId, IngredientId, Quantity) VALUES (?, ?, ?)', [
        productId,
        item.ingredientId,
        item.quantity,
      ])
    }

    await connection.commit()
    return getRecipeByProductId(productId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const getReceiptDetails = (receiptId) =>
  connection
    .query(
      `
        SELECT
          d.StockReceiptDetailId AS id,
          d.StockReceiptId AS receiptId,
          d.IngredientId AS ingredientId,
          i.IngredientName AS ingredientName,
          i.Unit AS unit,
          COALESCE(d.PurchaseQuantity, d.Quantity) AS purchaseQuantity,
          COALESCE(d.PurchaseUnit, i.Unit) AS purchaseUnit,
          COALESCE(d.ConversionQuantity, 1) AS conversionQuantity,
          COALESCE(d.BaseUnit, i.Unit) AS baseUnit,
          d.Quantity AS quantity,
          d.UnitPrice AS unitPrice,
          d.LineTotal AS lineTotal,
          d.ExpiryDate AS expiryDate
        FROM stock_receipt_details d
        INNER JOIN ingredients i ON i.IngredientId = d.IngredientId
        WHERE d.StockReceiptId = ?
        ORDER BY d.StockReceiptDetailId ASC
      `,
      [receiptId]
    )
    .then(([rows]) => rows)

const getReceipts = async () => {
  const [receipts] = await connection.query(`${receiptSelect} ORDER BY r.StockReceiptId DESC LIMIT 50`)
  return Promise.all(
    receipts.map(async (receipt) => ({
      ...receipt,
      details: await getReceiptDetails(receipt.id),
    }))
  )
}

const createReceipt = async ({ supplierId = null, accountId = null, note = null, details = [] }) => {
  await connection.beginTransaction()

  try {
    const totalAmount = details.reduce((sum, item) => sum + Number(item.purchaseQuantity || item.quantity || 0) * Number(item.purchaseUnitPrice || 0), 0)
    const [result] = await connection.query(
      'INSERT INTO stock_receipts (ReceiptCode, SupplierId, AccountId, TotalAmount, Note) VALUES (?, ?, ?, ?, ?)',
      [buildReceiptCode(), supplierId || null, accountId || null, totalAmount, note || null]
    )
    const receiptId = result.insertId

    for (const item of details) {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice)
      const purchaseQuantity = Number(item.purchaseQuantity || quantity)
      const purchaseUnit = item.purchaseUnit || item.baseUnit || null
      const conversionQuantity = Number(item.conversionQuantity || 1)
      const baseUnit = item.baseUnit || null
      const purchaseUnitPrice = Number(item.purchaseUnitPrice ?? unitPrice * conversionQuantity)
      const lineTotal = purchaseQuantity * purchaseUnitPrice

      const [ingredientRows] = await connection.query(
        'SELECT CurrentStock AS currentStock FROM ingredients WHERE IngredientId = ? FOR UPDATE',
        [item.ingredientId]
      )
      const ingredient = ingredientRows[0]
      if (!ingredient) {
        throw new Error('Nguyen lieu nhap kho khong hop le')
      }

      const beforeQuantity = Number(ingredient.currentStock || 0)
      const afterQuantity = beforeQuantity + quantity

      await connection.query(
        `
          INSERT INTO stock_receipt_details
            (StockReceiptId, IngredientId, PurchaseQuantity, PurchaseUnit, ConversionQuantity, BaseUnit, Quantity, UnitPrice, LineTotal, ExpiryDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [receiptId, item.ingredientId, purchaseQuantity, purchaseUnit, conversionQuantity, baseUnit, quantity, unitPrice, lineTotal, item.expiryDate || null]
      )
      await connection.query('UPDATE ingredients SET CurrentStock = ?, CostPrice = ? WHERE IngredientId = ?', [
        afterQuantity,
        unitPrice,
        item.ingredientId,
      ])
      await connection.query(
        `
          INSERT INTO stock_movements
            (IngredientId, MovementType, Quantity, BeforeQuantity, AfterQuantity, ReferenceType, ReferenceId, Note, AccountId)
          VALUES (?, 'Import', ?, ?, ?, 'StockReceipt', ?, ?, ?)
        `,
        [item.ingredientId, quantity, beforeQuantity, afterQuantity, receiptId, note || null, accountId || null]
      )
    }

    await connection.commit()
    const [rows] = await connection.query(`${receiptSelect} WHERE r.StockReceiptId = ? LIMIT 1`, [receiptId])
    return { ...rows[0], details: await getReceiptDetails(receiptId) }
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const getMovements = () =>
  connection
    .query(
      `
        SELECT
          m.StockMovementId AS id,
          m.IngredientId AS ingredientId,
          i.IngredientName AS ingredientName,
          i.Unit AS unit,
          m.MovementType AS movementType,
          m.Quantity AS quantity,
          m.BeforeQuantity AS beforeQuantity,
          m.AfterQuantity AS afterQuantity,
          m.ReferenceType AS referenceType,
          m.ReferenceId AS referenceId,
          m.Note AS note,
          acc.FullName AS employeeName,
          m.CreatedAt AS createdAt
        FROM stock_movements m
        INNER JOIN ingredients i ON i.IngredientId = m.IngredientId
        LEFT JOIN accounts acc ON acc.AccountId = m.AccountId
        ORDER BY m.StockMovementId DESC
        LIMIT 100
      `
    )
    .then(([rows]) => rows)

const getLowStockIngredients = () =>
  connection.query(`${ingredientSelect} WHERE i.Status = 'Active' AND i.CurrentStock <= i.MinStock ORDER BY i.CurrentStock ASC`).then(([rows]) => rows)

const consumeInvoiceStock = async (invoiceId, accountId = null) => {
  await connection.beginTransaction()

  try {
    const [invoiceRows] = await connection.query(
      'SELECT InvoiceId AS id, KitchenStatus AS kitchenStatus FROM invoices WHERE InvoiceId = ? FOR UPDATE',
      [invoiceId]
    )
    const invoice = invoiceRows[0]
    if (!invoice) {
      throw new Error('Khong tim thay hoa don')
    }

    if (invoice.kitchenStatus !== 'Draft') {
      await connection.commit()
      return true
    }

    const [existingMovements] = await connection.query(
      "SELECT StockMovementId AS id FROM stock_movements WHERE ReferenceType = 'Invoice' AND ReferenceId = ? LIMIT 1",
      [invoiceId]
    )
    if (existingMovements[0]) {
      await connection.commit()
      return true
    }

    const [requirements] = await connection.query(
      `
        SELECT
          r.IngredientId AS ingredientId,
          i.IngredientName AS ingredientName,
          i.Unit AS unit,
          i.CurrentStock AS currentStock,
          SUM(
            (
              r.Quantity
              + CASE
                  WHEN UPPER(SUBSTRING(COALESCE(d.Note, ''), 1, 6)) = 'SIZE L' THEN 5
                  ELSE 0
                END
            ) * d.Quantity
          ) AS requiredQuantity
        FROM invoice_details d
        INNER JOIN product_recipes r ON r.ProductId = d.ProductId
        INNER JOIN ingredients i ON i.IngredientId = r.IngredientId
        WHERE d.InvoiceId = ?
        GROUP BY r.IngredientId, i.IngredientName, i.Unit, i.CurrentStock
      `,
      [invoiceId]
    )

    if (requirements.length === 0) {
      await connection.commit()
      return true
    }

    const missingItems = requirements.filter((item) => Number(item.currentStock || 0) < Number(item.requiredQuantity || 0))
    if (missingItems.length > 0) {
      const detail = missingItems
        .map((item) => `${item.ingredientName} thiếu ${Number(item.requiredQuantity) - Number(item.currentStock)} ${item.unit}`)
        .join(', ')
      throw new Error(`Kho khong du nguyen lieu: ${detail}`)
    }

    for (const item of requirements) {
      const beforeQuantity = Number(item.currentStock || 0)
      const usedQuantity = Number(item.requiredQuantity || 0)
      const afterQuantity = beforeQuantity - usedQuantity

      await connection.query('UPDATE ingredients SET CurrentStock = ? WHERE IngredientId = ?', [afterQuantity, item.ingredientId])
      await connection.query(
        `
          INSERT INTO stock_movements
            (IngredientId, MovementType, Quantity, BeforeQuantity, AfterQuantity, ReferenceType, ReferenceId, Note, AccountId)
          VALUES (?, 'Sale', ?, ?, ?, 'Invoice', ?, ?, ?)
        `,
        [item.ingredientId, -usedQuantity, beforeQuantity, afterQuantity, invoiceId, `Tru kho theo hoa don #${invoiceId}`, accountId || null]
      )
    }

    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

module.exports = {
  adjustIngredientStock,
  consumeInvoiceStock,
  createIngredient,
  createIngredientCategory,
  createReceipt,
  createSupplier,
  findIngredientById,
  findIngredientByName,
  findIngredientCategoryById,
  findInactiveCategoryByName,
  findSupplierById,
  getIngredients,
  getIngredientCategories,
  getLowStockIngredients,
  getMovements,
  getReceiptDetails,
  getReceipts,
  getRecipeByProductId,
  getRecipes,
  getSuppliers,
  replaceRecipe,
  updateIngredient,
  updateIngredientCategory,
  updateSupplier,
}
