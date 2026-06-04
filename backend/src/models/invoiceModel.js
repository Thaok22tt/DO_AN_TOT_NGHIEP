const db = require('../config/database')

const connection = db.promise()

const invoiceSelect = `
  SELECT
    i.InvoiceId AS id,
    i.InvoiceCode AS code,
    i.ServiceNumber AS serviceNumber,
    i.TableId AS tableId,
    t.TableName AS tableName,
    a.AreaName AS areaName,
    i.AccountId AS accountId,
    acc.FullName AS cashierName,
    i.PromotionId AS promotionId,
    p.PromotionName AS promotionName,
    p.DiscountType AS promotionDiscountType,
    p.DiscountValue AS promotionDiscountValue,
    COALESCE(detailTotals.Subtotal, 0) AS subtotal,
    COALESCE(i.ShippingFee, 0) AS shippingFee,
    CASE
      WHEN i.PromotionId IS NULL THEN 0
      WHEN p.DiscountType = 'Percent' THEN ROUND(COALESCE(detailTotals.Subtotal, 0) * COALESCE(p.DiscountValue, 0) / 100)
      WHEN p.DiscountType = 'Fixed' THEN LEAST(COALESCE(detailTotals.Subtotal, 0), COALESCE(p.DiscountValue, 0))
      ELSE 0
    END AS discountAmount,
    i.OrderType AS orderType,
    i.KitchenStatus AS kitchenStatus,
    i.CustomerName AS customerName,
    i.TotalAmount AS totalAmount,
    i.Status AS status,
    i.PaymentMethod AS paymentMethod,
    i.AmountReceived AS amountReceived,
    i.ChangeAmount AS changeAmount,
    CASE WHEN i.Status = 'Paid' THEN i.UpdatedAt ELSE NULL END AS paidAt,
    i.Note AS note,
    i.CreatedAt AS createdAt,
    i.UpdatedAt AS updatedAt
  FROM invoices i
  LEFT JOIN \`tables\` t ON t.TableId = i.TableId
  LEFT JOIN areas a ON a.AreaId = t.AreaId
  LEFT JOIN accounts acc ON acc.AccountId = i.AccountId
  LEFT JOIN promotions p ON p.PromotionId = i.PromotionId
  LEFT JOIN (
    SELECT InvoiceId, SUM(LineTotal) AS Subtotal
    FROM invoice_details
    GROUP BY InvoiceId
  ) detailTotals ON detailTotals.InvoiceId = i.InvoiceId
`

// Select riêng cho lịch sử pha chế — chỉ dùng sau khi chạy migrate:barista-tracking
const historySelect = `
  SELECT
    i.InvoiceId AS id,
    i.InvoiceCode AS code,
    i.ServiceNumber AS serviceNumber,
    i.TableId AS tableId,
    t.TableName AS tableName,
    a.AreaName AS areaName,
    i.AccountId AS accountId,
    acc.FullName AS cashierName,
    i.BaristaAccountId AS baristaAccountId,
    bar.FullName AS baristaName,
    i.PromotionId AS promotionId,
    p.PromotionName AS promotionName,
    p.DiscountType AS promotionDiscountType,
    p.DiscountValue AS promotionDiscountValue,
    COALESCE(detailTotals.Subtotal, 0) AS subtotal,
    COALESCE(i.ShippingFee, 0) AS shippingFee,
    CASE
      WHEN i.PromotionId IS NULL THEN 0
      WHEN p.DiscountType = 'Percent' THEN ROUND(COALESCE(detailTotals.Subtotal, 0) * COALESCE(p.DiscountValue, 0) / 100)
      WHEN p.DiscountType = 'Fixed' THEN LEAST(COALESCE(detailTotals.Subtotal, 0), COALESCE(p.DiscountValue, 0))
      ELSE 0
    END AS discountAmount,
    i.OrderType AS orderType,
    i.KitchenStatus AS kitchenStatus,
    i.CustomerName AS customerName,
    i.TotalAmount AS totalAmount,
    i.Status AS status,
    i.PaymentMethod AS paymentMethod,
    i.AmountReceived AS amountReceived,
    i.ChangeAmount AS changeAmount,
    CASE WHEN i.Status = 'Paid' THEN i.UpdatedAt ELSE NULL END AS paidAt,
    i.Note AS note,
    i.CreatedAt AS createdAt,
    i.UpdatedAt AS updatedAt
  FROM invoices i
  LEFT JOIN \`tables\` t ON t.TableId = i.TableId
  LEFT JOIN areas a ON a.AreaId = t.AreaId
  LEFT JOIN accounts acc ON acc.AccountId = i.AccountId
  LEFT JOIN accounts bar ON bar.AccountId = i.BaristaAccountId
  LEFT JOIN promotions p ON p.PromotionId = i.PromotionId
  LEFT JOIN (
    SELECT InvoiceId, SUM(LineTotal) AS Subtotal
    FROM invoice_details
    GROUP BY InvoiceId
  ) detailTotals ON detailTotals.InvoiceId = i.InvoiceId
`

const normalizeDate = (value) => (typeof value === 'string' ? value.trim().slice(0, 10) : '')

const buildInvoiceCode = () => `INV${Date.now()}`

const SIZE_SURCHARGE = 5000

const normalizeCupSize = (value) => {
  const size = String(value || '').trim().toUpperCase()
  return ['M', 'L'].includes(size) ? size : null
}

const stripSizePrefix = (note = '') => String(note || '').replace(/^Size\s+[ML]\s*(?:-\s*)?/i, '').trim()

const buildSizeNote = (size, note = '') => {
  const cleanNote = stripSizePrefix(note)
  return cleanNote ? `Size ${size} - ${cleanNote}` : `Size ${size}`
}

const getInvoiceDetails = (invoiceId) => {
  const sql = `
    SELECT
      InvoiceDetailId AS id,
      InvoiceId AS invoiceId,
      ProductId AS productId,
      ProductName AS productName,
      Quantity AS quantity,
      UnitPrice AS unitPrice,
      LineTotal AS lineTotal,
      Note AS note
    FROM invoice_details
    WHERE InvoiceId = ?
    ORDER BY InvoiceDetailId ASC
  `

  return connection.query(sql, [invoiceId]).then(([rows]) => rows)
}

const getInvoiceTotals = async (invoiceId) => {
  const [detailRows] = await connection.query(
    'SELECT COALESCE(SUM(LineTotal), 0) AS subtotal FROM invoice_details WHERE InvoiceId = ?',
    [invoiceId]
  )

  const [invoiceRows] = await connection.query(
    'SELECT PromotionId AS promotionId, COALESCE(ShippingFee, 0) AS shippingFee FROM invoices WHERE InvoiceId = ? LIMIT 1',
    [invoiceId]
  )

  const subtotal = Number(detailRows[0]?.subtotal || 0)
  const promotionId = invoiceRows[0]?.promotionId || null
  const shippingFee = Number(invoiceRows[0]?.shippingFee || 0)
  let discountAmount = 0

  if (promotionId) {
    const [promotionRows] = await connection.query(
      `
        SELECT PromotionId AS id, DiscountType AS discountType, DiscountValue AS discountValue
        FROM promotions
        WHERE PromotionId = ?
          AND Status = 'Active'
          AND CURDATE() BETWEEN StartDate AND EndDate
        LIMIT 1
      `,
      [promotionId]
    )

    const promotion = promotionRows[0]
    if (promotion) {
      discountAmount =
        promotion.discountType === 'Percent'
          ? Math.round((subtotal * Number(promotion.discountValue || 0)) / 100)
          : Math.min(subtotal, Number(promotion.discountValue || 0))
    }
  }

  return {
    discountAmount,
    shippingFee,
    subtotal,
    totalAmount: Math.max(subtotal - discountAmount + shippingFee, 0),
  }
}

const getInvoices = ({ keyword = '', status = '', startDate = '', endDate = '', accountId = null } = {}) => {
  const conditions = []
  const params = []
  let sql = invoiceSelect

  if (accountId) {
    conditions.push('i.AccountId = ?')
    params.push(accountId)
  }

  if (keyword) {
    conditions.push(
      '(i.InvoiceCode LIKE ? OR i.ServiceNumber LIKE ? OR i.CustomerName LIKE ? OR t.TableName LIKE ? OR a.AreaName LIKE ? OR acc.FullName LIKE ?)'
    )
    const likeKeyword = `%${keyword}%`
    params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword)
  }

  if (status) {
    conditions.push('i.Status = ?')
    params.push(status)
  }

  if (startDate) {
    conditions.push('DATE(i.CreatedAt) >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('DATE(i.CreatedAt) <= ?')
    params.push(endDate)
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }

  sql += ' ORDER BY i.InvoiceId DESC'

  return connection.query(sql, params).then(([rows]) => rows)
}

const findById = (id) => {
  const sql = `${invoiceSelect} WHERE i.InvoiceId = ? LIMIT 1`

  return connection.query(sql, [id]).then(([rows]) => rows[0])
}

const createInvoice = async ({
  tableId = null,
  accountId = null,
  orderType = 'DineIn',
  note = null,
  promotionId = null,
  customerName = null,
  serviceNumber = null,
  shippingFee = 0,
}) => {
  await connection.beginTransaction()

  try {
    const code = buildInvoiceCode()
    const sql = `
      INSERT INTO invoices
        (InvoiceCode, ServiceNumber, TableId, AccountId, PromotionId, OrderType, CustomerName, ShippingFee, TotalAmount, Status, KitchenStatus, Note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Unpaid', 'Draft', ?)
    `
    const [result] = await connection.query(sql, [
      code,
      serviceNumber || null,
      tableId || null,
      accountId || null,
      promotionId || null,
      orderType || 'DineIn',
      customerName || null,
      Math.max(Number(shippingFee || 0), 0),
      note || null,
    ])

    if (tableId) {
      await connection.query("UPDATE `tables` SET Status = 'Occupied' WHERE TableId = ?", [tableId])
    }

    await connection.commit()
    return findById(result.insertId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const addInvoiceItem = async (invoiceId, { productId, quantity, note = null, size = null }) => {
  await connection.beginTransaction()

  try {
    const [invoiceRows] = await connection.query(
      'SELECT InvoiceId AS id, KitchenStatus AS kitchenStatus FROM invoices WHERE InvoiceId = ? LIMIT 1',
      [invoiceId]
    )
    const invoice = invoiceRows[0]

    if (!invoice) {
      throw new Error('Khong tim thay hoa don')
    }

    if (invoice.kitchenStatus !== 'Draft') {
      throw new Error('Chi duoc sua hoa don khi chua gui pha che')
    }

    const [productRows] = await connection.query(
      `
        SELECT ProductId AS id, ProductName AS name, Price AS price
        FROM products
        WHERE ProductId = ? AND Status = 'Active'
        LIMIT 1
      `,
      [productId]
    )
    const product = productRows[0]

    if (!product) {
      throw new Error('San pham khong hop le')
    }

    const cupSize = normalizeCupSize(size)
    const unitPrice = Number(product.price) + (cupSize === 'L' ? SIZE_SURCHARGE : 0)
    const lineTotal = unitPrice * Number(quantity)
    const detailNote = cupSize ? buildSizeNote(cupSize, note) : stripSizePrefix(note)
    await connection.query(
      `
        INSERT INTO invoice_details
          (InvoiceId, ProductId, ProductName, Quantity, UnitPrice, LineTotal, Note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [invoiceId, product.id, product.name, quantity, unitPrice, lineTotal, detailNote]
    )

    const totals = await getInvoiceTotals(invoiceId)
    await connection.query('UPDATE invoices SET TotalAmount = ? WHERE InvoiceId = ?', [totals.totalAmount, invoiceId])
    await connection.commit()

    return findById(invoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const updateInvoiceDetailSize = async (detailId, { size, note = '' }) => {
  await connection.beginTransaction()

  try {
    const [detailRows] = await connection.query(
      `
        SELECT
          d.InvoiceDetailId AS id,
          d.InvoiceId AS invoiceId,
          d.ProductId AS productId,
          d.Quantity AS quantity,
          d.Note AS note,
          i.KitchenStatus AS kitchenStatus,
          p.Price AS productPrice
        FROM invoice_details d
        INNER JOIN invoices i ON i.InvoiceId = d.InvoiceId
        LEFT JOIN products p ON p.ProductId = d.ProductId
        WHERE d.InvoiceDetailId = ?
        LIMIT 1
      `,
      [detailId]
    )
    const detail = detailRows[0]

    if (!detail) {
      throw new Error('Khong tim thay chi tiet hoa don')
    }

    if (detail.kitchenStatus !== 'Draft') {
      throw new Error('Chi duoc sua khi chua gui pha che')
    }

    if (detail.productPrice === null || detail.productPrice === undefined) {
      throw new Error('Khong tim thay gia san pham')
    }

    const cupSize = normalizeCupSize(size)
    const unitPrice = Number(detail.productPrice) + (cupSize === 'L' ? SIZE_SURCHARGE : 0)
    const lineTotal = unitPrice * Number(detail.quantity || 0)
    const detailNote = buildSizeNote(cupSize, note || detail.note)

    await connection.query(
      'UPDATE invoice_details SET UnitPrice = ?, LineTotal = ?, Note = ? WHERE InvoiceDetailId = ?',
      [unitPrice, lineTotal, detailNote, detailId]
    )

    const totals = await getInvoiceTotals(detail.invoiceId)
    await connection.query('UPDATE invoices SET TotalAmount = ? WHERE InvoiceId = ?', [totals.totalAmount, detail.invoiceId])
    await connection.commit()

    return findById(detail.invoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const updateInvoiceDetailQuantity = async (detailId, quantity) => {
  await connection.beginTransaction()

  try {
    const [detailRows] = await connection.query(
      `
        SELECT d.InvoiceDetailId AS id, d.InvoiceId AS invoiceId, i.KitchenStatus AS kitchenStatus
        FROM invoice_details d
        INNER JOIN invoices i ON i.InvoiceId = d.InvoiceId
        WHERE d.InvoiceDetailId = ?
        LIMIT 1
      `,
      [detailId]
    )
    const detail = detailRows[0]

    if (!detail) {
      throw new Error('Khong tim thay chi tiet hoa don')
    }

    if (detail.kitchenStatus !== 'Draft') {
      throw new Error('Chi duoc sua khi chua gui pha che')
    }

    const [valueRows] = await connection.query(
      'SELECT UnitPrice AS unitPrice FROM invoice_details WHERE InvoiceDetailId = ? LIMIT 1',
      [detailId]
    )
    const unitPrice = Number(valueRows[0]?.unitPrice || 0)
    const lineTotal = unitPrice * Number(quantity)

    await connection.query(
      'UPDATE invoice_details SET Quantity = ?, LineTotal = ? WHERE InvoiceDetailId = ?',
      [quantity, lineTotal, detailId]
    )

    const totals = await getInvoiceTotals(detail.invoiceId)
    await connection.query('UPDATE invoices SET TotalAmount = ? WHERE InvoiceId = ?', [totals.totalAmount, detail.invoiceId])
    await connection.commit()

    return findById(detail.invoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const updateInvoiceDetailNote = async (detailId, note) => {
  const [detailRows] = await connection.query(
    `
      SELECT d.InvoiceDetailId AS id, i.KitchenStatus AS kitchenStatus
      FROM invoice_details d
      INNER JOIN invoices i ON i.InvoiceId = d.InvoiceId
      WHERE d.InvoiceDetailId = ?
      LIMIT 1
    `,
    [detailId]
  )
  const detail = detailRows[0]

  if (!detail) {
    throw new Error('Khong tim thay chi tiet hoa don')
  }

  if (detail.kitchenStatus !== 'Draft') {
    throw new Error('Chi duoc sua ghi chu khi chua gui pha che')
  }

  const [result] = await connection.query('UPDATE invoice_details SET Note = ? WHERE InvoiceDetailId = ?', [note || null, detailId])

  return result.affectedRows > 0
}

const deleteInvoiceDetail = async (detailId) => {
  await connection.beginTransaction()

  try {
    const [detailRows] = await connection.query(
      `
        SELECT d.InvoiceDetailId AS id, d.InvoiceId AS invoiceId, i.KitchenStatus AS kitchenStatus
        FROM invoice_details d
        INNER JOIN invoices i ON i.InvoiceId = d.InvoiceId
        WHERE d.InvoiceDetailId = ?
        LIMIT 1
      `,
      [detailId]
    )
    const detail = detailRows[0]

    if (!detail) {
      throw new Error('Khong tim thay chi tiet hoa don')
    }

    if (detail.kitchenStatus !== 'Draft') {
      throw new Error('Chi duoc xoa khi chua gui pha che')
    }

    await connection.query('DELETE FROM invoice_details WHERE InvoiceDetailId = ?', [detailId])

    const totals = await getInvoiceTotals(detail.invoiceId)
    await connection.query('UPDATE invoices SET TotalAmount = ? WHERE InvoiceId = ?', [totals.totalAmount, detail.invoiceId])
    await connection.commit()

    return true
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const updateInvoiceNote = async (invoiceId, note) => {
  const [result] = await connection.query('UPDATE invoices SET Note = ? WHERE InvoiceId = ?', [note || null, invoiceId])

  return result.affectedRows > 0
}

const setKitchenStatus = async (invoiceId, kitchenStatus) => {
  const [result] = await connection.query('UPDATE invoices SET KitchenStatus = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceId = ?', [kitchenStatus, invoiceId])

  return result.affectedRows > 0
}

const updatePaymentMethod = async (invoiceId, paymentMethod) => {
  const [result] = await connection.query('UPDATE invoices SET PaymentMethod = ? WHERE InvoiceId = ?', [paymentMethod || null, invoiceId])

  return result.affectedRows > 0
}

const applyPromotion = async (invoiceId, promotionId) => {
  const [invoiceRows] = await connection.query(
    'SELECT InvoiceId AS id, KitchenStatus AS kitchenStatus FROM invoices WHERE InvoiceId = ? LIMIT 1',
    [invoiceId]
  )
  const invoice = invoiceRows[0]

  if (!invoice) {
    throw new Error('Khong tim thay hoa don')
  }

  if (!promotionId) {
    await connection.query('UPDATE invoices SET PromotionId = NULL WHERE InvoiceId = ?', [invoiceId])
    const totals = await getInvoiceTotals(invoiceId)
    await connection.query('UPDATE invoices SET TotalAmount = ? WHERE InvoiceId = ?', [totals.totalAmount, invoiceId])
    return findById(invoiceId)
  }

  const [promotionRows] = await connection.query(
    `
      SELECT PromotionId AS id
      FROM promotions
      WHERE PromotionId = ?
        AND Status = 'Active'
        AND CURDATE() BETWEEN StartDate AND EndDate
      LIMIT 1
    `,
    [promotionId]
  )

  if (!promotionRows[0]) {
    throw new Error('Khuyen mai khong hop le')
  }

  await connection.query('UPDATE invoices SET PromotionId = ? WHERE InvoiceId = ?', [promotionId, invoiceId])
  const totals = await getInvoiceTotals(invoiceId)
  await connection.query('UPDATE invoices SET TotalAmount = ? WHERE InvoiceId = ?', [totals.totalAmount, invoiceId])

  return findById(invoiceId)
}

const confirmPayment = async (invoiceId, { paymentMethod, amountReceived = null }) => {
  await connection.beginTransaction()

  try {
    const invoice = await findById(invoiceId)
    if (!invoice) {
      throw new Error('Khong tim thay hoa don')
    }

    const totals = await getInvoiceTotals(invoiceId)
    const finalAmount = totals.totalAmount
    const received = paymentMethod === 'Cash' ? Number(amountReceived || 0) : finalAmount

    if (paymentMethod === 'Cash' && received < finalAmount) {
      throw new Error('So tien nhan phai lon hon hoac bang tong tien')
    }

    await connection.query(
      `
        UPDATE invoices
        SET Status = 'Paid',
            PaymentMethod = ?,
            AmountReceived = ?,
            ChangeAmount = ?,
            TotalAmount = ?,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE InvoiceId = ?
      `,
      [
        paymentMethod,
        paymentMethod === 'Cash' ? received : finalAmount,
        paymentMethod === 'Cash' ? received - finalAmount : 0,
        finalAmount,
        invoiceId,
      ]
    )

    if (invoice.tableId && invoice.status === 'Completed') {
      await connection.query("UPDATE `tables` SET Status = 'Available' WHERE TableId = ?", [invoice.tableId])
    }

    await connection.commit()
    return findById(invoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const completeInvoice = async (invoiceId) => {
  const invoice = await findById(invoiceId)

  if (!invoice) {
    throw new Error('Khong tim thay hoa don')
  }

  if (invoice.status !== 'Paid') {
    throw new Error('Hoa don phai da thanh toan')
  }

  if (invoice.tableId) {
    await connection.query("UPDATE `tables` SET Status = 'Available' WHERE TableId = ?", [invoice.tableId])
  }

  await connection.query("UPDATE invoices SET Status = 'Completed', UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceId = ?", [invoiceId])
  return findById(invoiceId)
}

const updateInvoiceStatus = async (invoiceId, status) => {
  const [result] = await connection.query('UPDATE invoices SET Status = ? WHERE InvoiceId = ?', [status, invoiceId])

  return result.affectedRows > 0
}

const transferInvoiceTable = async (invoiceId, targetTableId) => {
  await connection.beginTransaction()

  try {
    const invoice = await findById(invoiceId)
    if (!invoice) {
      throw new Error('Khong tim thay hoa don')
    }

    if (invoice.status !== 'Unpaid') {
      throw new Error('Chi chuyen ban cho hoa don chua thanh toan')
    }

    const [targetRows] = await connection.query('SELECT TableId AS id, Status AS status FROM `tables` WHERE TableId = ? LIMIT 1', [targetTableId])
    const targetTable = targetRows[0]
    if (!targetTable || targetTable.status !== 'Available') {
      throw new Error('Ban dich khong kha dung')
    }

    await connection.query('UPDATE invoices SET TableId = ?, OrderType = ? WHERE InvoiceId = ?', [targetTableId, 'DineIn', invoiceId])

    if (invoice.tableId) {
      await connection.query("UPDATE `tables` SET Status = 'Available' WHERE TableId = ?", [invoice.tableId])
    }

    await connection.query("UPDATE `tables` SET Status = ? WHERE TableId = ?", [
      invoice.kitchenStatus === 'Waiting' || invoice.kitchenStatus === 'InProgress' ? 'Preparing' : 'Occupied',
      targetTableId,
    ])

    await connection.commit()
    return findById(invoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const mergeInvoices = async (sourceInvoiceId, targetInvoiceId) => {
  await connection.beginTransaction()

  try {
    const sourceInvoice = await findById(sourceInvoiceId)
    const targetInvoice = await findById(targetInvoiceId)

    if (!sourceInvoice || !targetInvoice) {
      throw new Error('Khong tim thay hoa don')
    }

    if (sourceInvoice.id === targetInvoice.id) {
      throw new Error('Vui long chon hai hoa don khac nhau')
    }

    if (sourceInvoice.status !== 'Unpaid' || targetInvoice.status !== 'Unpaid') {
      throw new Error('Chi gop hoa don chua thanh toan')
    }

    await connection.query('UPDATE invoice_details SET InvoiceId = ? WHERE InvoiceId = ?', [targetInvoiceId, sourceInvoiceId])

    const targetTotals = await getInvoiceTotals(targetInvoiceId)
    await connection.query('UPDATE invoices SET TotalAmount = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceId = ?', [targetTotals.totalAmount, targetInvoiceId])
    await connection.query(
      "UPDATE invoices SET Status = 'Cancelled', TotalAmount = 0, UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceId = ?",
      [sourceInvoiceId],
    )

    if (sourceInvoice.tableId) {
      await connection.query("UPDATE `tables` SET Status = 'Available' WHERE TableId = ?", [sourceInvoice.tableId])
    }

    if (targetInvoice.tableId) {
      await connection.query("UPDATE `tables` SET Status = ? WHERE TableId = ?", [
        targetInvoice.kitchenStatus === 'Waiting' || targetInvoice.kitchenStatus === 'InProgress' ? 'Preparing' : 'Occupied',
        targetInvoice.tableId,
      ])
    }

    await connection.commit()
    return findById(targetInvoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const markServed = async (invoiceId) => {
  await connection.beginTransaction()

  try {
    const invoice = await findById(invoiceId)
    if (!invoice) {
      throw new Error('Khong tim thay hoa don')
    }

    if (invoice.status === 'Cancelled') {
      throw new Error('Hoa don da bi huy')
    }

    if (invoice.kitchenStatus !== 'Completed') {
      throw new Error('Chi duoc ra ban khi pha che da hoan thanh')
    }

    await connection.query("UPDATE invoices SET Status = 'Completed', UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceId = ?", [invoiceId])

    if (invoice.tableId) {
      await connection.query("UPDATE `tables` SET Status = 'Occupied' WHERE TableId = ?", [invoice.tableId])
    }

    await connection.commit()
    return findById(invoiceId)
  } catch (error) {
    await connection.rollback()
    throw error
  }
}

const getKitchenOrders = async ({ status = '' } = {}) => {
  const conditions = ["i.KitchenStatus <> 'Draft'"]
  const params = []
  let sql = invoiceSelect

  if (status) {
    conditions.push('i.KitchenStatus = ?')
    params.push(status)
  }

  sql += ` WHERE ${conditions.join(' AND ')} ORDER BY i.CreatedAt DESC, i.InvoiceId DESC`

  const [orders] = await connection.query(sql, params)
  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      details: await getInvoiceDetails(order.id),
    }))
  )

  return ordersWithDetails
}

const updateKitchenStatus = async (invoiceId, kitchenStatus) => {
  const [result] = await connection.query('UPDATE invoices SET KitchenStatus = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceId = ?', [kitchenStatus, invoiceId])

  return result.affectedRows > 0
}

// Ghi nhận pha chế nhận đơn — silent nếu cột chưa tồn tại (migration chưa chạy)
const setBaristaAccountId = async (invoiceId, baristaAccountId) => {
  try {
    await connection.query(
      'UPDATE invoices SET BaristaAccountId = ? WHERE InvoiceId = ? AND BaristaAccountId IS NULL',
      [baristaAccountId, invoiceId]
    )
  } catch {
    // Cột chưa tồn tại — bỏ qua, không ảnh hưởng luồng chính
  }
}

// Lịch sử đơn pha chế: trả về tất cả Completed + Cancelled theo ngày
// Đồng bộ với nguồn dữ liệu hóa đơn chung của Admin
const getKitchenHistory = async ({ startDate = '', endDate = '' } = {}) => {
  const conditions = [
    // Đơn lịch sử: barista hoàn thành | đã ra bàn | bị hủy | đã thanh toán (trừ Draft chưa gửi pha chế)
    "(i.KitchenStatus = 'Completed' OR i.Status IN ('Completed', 'Cancelled') OR (i.Status = 'Paid' AND i.KitchenStatus <> 'Draft'))",
  ]
  const params = []

  if (startDate) {
    conditions.push('DATE(i.CreatedAt) >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('DATE(i.CreatedAt) <= ?')
    params.push(endDate)
  }

  const sql = `${historySelect} WHERE ${conditions.join(' AND ')} ORDER BY i.CreatedAt DESC, i.InvoiceId DESC`
  const [orders] = await connection.query(sql, params)

  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => ({
      ...order,
      details: await getInvoiceDetails(order.id),
    }))
  )

  return ordersWithDetails
}

module.exports = {
  addInvoiceItem,
  applyPromotion,
  completeInvoice,
  confirmPayment,
  createInvoice,
  deleteInvoiceDetail,
  findById,
  getInvoiceDetails,
  getInvoiceTotals,
  getInvoices,
  getKitchenHistory,
  getKitchenOrders,
  markServed,
  mergeInvoices,
  setBaristaAccountId,
  setKitchenStatus,
  transferInvoiceTable,
  updateInvoiceDetailNote,
  updateInvoiceDetailQuantity,
  updateInvoiceDetailSize,
  updateInvoiceNote,
  updateInvoiceStatus,
  updateKitchenStatus,
  updatePaymentMethod,
}
