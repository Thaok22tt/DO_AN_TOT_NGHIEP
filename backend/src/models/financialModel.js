const db = require('../config/database')

const getRevenueSummary = (year, month) => {
  const sql = `
    SELECT
      COALESCE(SUM(i.TotalAmount), 0) AS totalRevenue,
      COUNT(i.InvoiceId) AS invoiceCount
    FROM invoices i
    WHERE (i.Status = 'Paid' OR i.Status = 'Completed')
      AND YEAR(i.CreatedAt) = ?
      AND MONTH(i.CreatedAt) = ?
  `
  return db.promise().query(sql, [year, month]).then(([rows]) => rows[0])
}

const getStockCostSummary = (year, month) => {
  const sql = `
    SELECT COALESCE(SUM(TotalAmount), 0) AS totalStockCost
    FROM stock_receipts
    WHERE YEAR(CreatedAt) = ? AND MONTH(CreatedAt) = ?
  `
  return db.promise().query(sql, [year, month]).then(([rows]) => rows[0])
}

const getSalarySummary = (year, month) => {
  const sql = `
    SELECT COALESCE(SUM(ws.TotalHours * e.HourlyRate), 0) AS totalSalary
    FROM work_shifts ws
    JOIN accounts a ON a.AccountId = ws.AccountId
    JOIN employees e ON e.AccountId = a.AccountId
    WHERE YEAR(ws.WorkDate) = ? AND MONTH(ws.WorkDate) = ?
      AND ws.TotalHours IS NOT NULL AND ws.TotalHours > 0
  `
  return db.promise().query(sql, [year, month]).then(([rows]) => rows[0])
}

const getDailyRevenue = (year, month) => {
  const sql = `
    SELECT
      DATE_FORMAT(COALESCE(i.UpdatedAt, i.CreatedAt), '%Y-%m-%d') AS date,
      COALESCE(SUM(i.TotalAmount), 0) AS revenue,
      COUNT(i.InvoiceId) AS invoiceCount
    FROM invoices i
    WHERE (i.Status = 'Paid' OR i.Status = 'Completed')
      AND YEAR(COALESCE(i.UpdatedAt, i.CreatedAt)) = ?
      AND MONTH(COALESCE(i.UpdatedAt, i.CreatedAt)) = ?
    GROUP BY DATE_FORMAT(COALESCE(i.UpdatedAt, i.CreatedAt), '%Y-%m-%d')
    ORDER BY date ASC
  `
  return db.promise().query(sql, [year, month]).then(([rows]) => rows)
}

const getDailyStockCost = (year, month) => {
  const sql = `
    SELECT
      DATE_FORMAT(CreatedAt, '%Y-%m-%d') AS date,
      COALESCE(SUM(TotalAmount), 0) AS stockCost
    FROM stock_receipts
    WHERE YEAR(CreatedAt) = ? AND MONTH(CreatedAt) = ?
    GROUP BY DATE_FORMAT(CreatedAt, '%Y-%m-%d')
    ORDER BY date ASC
  `
  return db.promise().query(sql, [year, month]).then(([rows]) => rows)
}

const getDailySalary = (year, month) => {
  const sql = `
    SELECT
      DATE_FORMAT(ws.WorkDate, '%Y-%m-%d') AS date,
      COALESCE(SUM(ws.TotalHours * e.HourlyRate), 0) AS salary
    FROM work_shifts ws
    JOIN accounts a ON a.AccountId = ws.AccountId
    JOIN employees e ON e.AccountId = a.AccountId
    WHERE YEAR(ws.WorkDate) = ? AND MONTH(ws.WorkDate) = ?
      AND ws.TotalHours IS NOT NULL AND ws.TotalHours > 0
    GROUP BY DATE_FORMAT(ws.WorkDate, '%Y-%m-%d')
    ORDER BY date ASC
  `
  return db.promise().query(sql, [year, month]).then(([rows]) => rows)
}

module.exports = {
  getDailyRevenue,
  getDailyStockCost,
  getDailySalary,
  getRevenueSummary,
  getStockCostSummary,
  getSalarySummary,
}
