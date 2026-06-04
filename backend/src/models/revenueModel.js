const db = require('../config/database')

const paidCondition = "(i.Status = 'Paid' OR i.Status = 'Completed')"
const paidAtExpression = 'COALESCE(i.UpdatedAt, i.CreatedAt)'

const getRevenueSummary = (startDate, endDate) => {
  const sql = `
    SELECT
      COALESCE(SUM(i.TotalAmount), 0) AS totalRevenue,
      COUNT(i.InvoiceId) AS invoiceCount,
      COALESCE(AVG(i.TotalAmount), 0) AS averageInvoiceValue,
      MIN(${paidAtExpression}) AS firstInvoiceAt,
      MAX(${paidAtExpression}) AS lastInvoiceAt
    FROM invoices i
    WHERE ${paidCondition}
      AND DATE(${paidAtExpression}) BETWEEN ? AND ?
  `

  return db.promise().query(sql, [startDate, endDate]).then(([rows]) => rows[0])
}

const getDailyBreakdown = (startDate, endDate) => {
  const sql = `
    SELECT
      DATE(${paidAtExpression}) AS period,
      COALESCE(SUM(i.TotalAmount), 0) AS revenue,
      COUNT(i.InvoiceId) AS invoiceCount
    FROM invoices i
    WHERE ${paidCondition}
      AND DATE(${paidAtExpression}) BETWEEN ? AND ?
    GROUP BY DATE(${paidAtExpression})
    ORDER BY period ASC
  `

  return db.promise().query(sql, [startDate, endDate]).then(([rows]) => rows)
}

const getMonthlyBreakdown = (year) => {
  const sql = `
    SELECT
      MONTH(${paidAtExpression}) AS period,
      COALESCE(SUM(i.TotalAmount), 0) AS revenue,
      COUNT(i.InvoiceId) AS invoiceCount
    FROM invoices i
    WHERE ${paidCondition}
      AND YEAR(${paidAtExpression}) = ?
    GROUP BY MONTH(${paidAtExpression})
    ORDER BY period ASC
  `

  return db.promise().query(sql, [year]).then(([rows]) => rows)
}

const getYearlyBreakdown = (startYear, endYear) => {
  const sql = `
    SELECT
      YEAR(${paidAtExpression}) AS period,
      COALESCE(SUM(i.TotalAmount), 0) AS revenue,
      COUNT(i.InvoiceId) AS invoiceCount
    FROM invoices i
    WHERE ${paidCondition}
      AND YEAR(${paidAtExpression}) BETWEEN ? AND ?
    GROUP BY YEAR(${paidAtExpression})
    ORDER BY period ASC
  `

  return db.promise().query(sql, [startYear, endYear]).then(([rows]) => rows)
}

const getRecentPaidInvoices = (startDate, endDate) => {
  const sql = `
    SELECT
      i.InvoiceId AS id,
      i.InvoiceCode AS code,
      i.CustomerName AS customerName,
      i.TotalAmount AS totalAmount,
      i.PaymentMethod AS paymentMethod,
      i.CreatedAt AS createdAt,
      ${paidAtExpression} AS paidAt,
      t.TableName AS tableName,
      a.AreaName AS areaName,
      acc.FullName AS cashierName
    FROM invoices i
    LEFT JOIN \`tables\` t ON t.TableId = i.TableId
    LEFT JOIN areas a ON a.AreaId = t.AreaId
    LEFT JOIN accounts acc ON acc.AccountId = i.AccountId
    WHERE ${paidCondition}
      AND DATE(${paidAtExpression}) BETWEEN ? AND ?
    ORDER BY ${paidAtExpression} DESC
    LIMIT 10
  `

  return db.promise().query(sql, [startDate, endDate]).then(([rows]) => rows)
}

const getTopProducts = (startDate, endDate) => {
  const sql = `
    SELECT
      d.ProductId AS productId,
      d.ProductName AS productName,
      p.Image AS image,
      c.CategoryName AS categoryName,
      COALESCE(SUM(d.Quantity), 0) AS quantity,
      COALESCE(SUM(d.LineTotal), 0) AS revenue
    FROM invoice_details d
    INNER JOIN invoices i ON i.InvoiceId = d.InvoiceId
    LEFT JOIN products p ON p.ProductId = d.ProductId
    LEFT JOIN categories c ON c.CategoryId = p.CategoryId
    WHERE ${paidCondition}
      AND DATE(${paidAtExpression}) BETWEEN ? AND ?
    GROUP BY d.ProductId, d.ProductName, p.Image, c.CategoryName
    ORDER BY revenue DESC, quantity DESC
    LIMIT 5
  `

  return db.promise().query(sql, [startDate, endDate]).then(([rows]) => rows)
}

const getHourlyBreakdown = (startDate, endDate) => {
  const sql = `
    SELECT
      HOUR(${paidAtExpression}) AS hour,
      COALESCE(SUM(i.TotalAmount), 0) AS revenue,
      COUNT(i.InvoiceId) AS invoiceCount
    FROM invoices i
    WHERE ${paidCondition}
      AND DATE(${paidAtExpression}) BETWEEN ? AND ?
    GROUP BY HOUR(${paidAtExpression})
    ORDER BY hour ASC
  `

  return db.promise().query(sql, [startDate, endDate]).then(([rows]) => rows)
}

module.exports = {
  getDailyBreakdown,
  getHourlyBreakdown,
  getMonthlyBreakdown,
  getRecentPaidInvoices,
  getRevenueSummary,
  getTopProducts,
  getYearlyBreakdown,
}
