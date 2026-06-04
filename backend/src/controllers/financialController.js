const financialModel = require('../models/financialModel')

const MIN_YEAR = 2020

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate()

const buildDailyBreakdown = (year, month, revenues, stockCosts, salaries) => {
  const revenueMap = new Map(revenues.map((r) => [String(r.date).slice(0, 10), r]))
  const stockMap = new Map(stockCosts.map((s) => [String(s.date).slice(0, 10), s]))
  const salaryMap = new Map(salaries.map((s) => [String(s.date).slice(0, 10), s]))

  const days = getDaysInMonth(year, month)
  return Array.from({ length: days }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    const monthStr = String(month).padStart(2, '0')
    const date = `${year}-${monthStr}-${day}`

    const revenue = Number(revenueMap.get(date)?.revenue || 0)
    const stockCost = Number(stockMap.get(date)?.stockCost || 0)
    const salary = Number(salaryMap.get(date)?.salary || 0)
    const invoiceCount = Number(revenueMap.get(date)?.invoiceCount || 0)

    return {
      date,
      invoiceCount,
      profit: revenue - stockCost - salary,
      revenue,
      salary,
      stockCost,
    }
  })
}

const getMonthlyFinancialReport = async (req, res) => {
  try {
    const month = Number(req.query.month)
    const year = Number(req.query.year)

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Tháng không hợp lệ (1-12)' })
    }
    if (!Number.isInteger(year) || year < MIN_YEAR) {
      return res.status(400).json({ message: `Năm phải lớn hơn hoặc bằng ${MIN_YEAR}` })
    }

    const [revenueSummary, stockSummary, salarySummary, revenues, stockCosts, salaries] = await Promise.all([
      financialModel.getRevenueSummary(year, month),
      financialModel.getStockCostSummary(year, month),
      financialModel.getSalarySummary(year, month),
      financialModel.getDailyRevenue(year, month),
      financialModel.getDailyStockCost(year, month),
      financialModel.getDailySalary(year, month),
    ])

    const totalRevenue = Number(revenueSummary.totalRevenue || 0)
    const totalStockCost = Number(stockSummary.totalStockCost || 0)
    const totalSalary = Number(salarySummary.totalSalary || 0)

    return res.json({
      report: {
        dailyBreakdown: buildDailyBreakdown(year, month, revenues, stockCosts, salaries),
        month,
        summary: {
          invoiceCount: Number(revenueSummary.invoiceCount || 0),
          profit: totalRevenue - totalStockCost - totalSalary,
          totalRevenue,
          totalSalary,
          totalStockCost,
        },
        year,
      },
    })
  } catch (error) {
    console.error('[financial] getMonthlyFinancialReport failed', error)
    return res.status(500).json({ message: 'Lỗi server khi tải báo cáo tài chính', error: error.message })
  }
}

module.exports = { getMonthlyFinancialReport }
