const revenueModel = require('../models/revenueModel')

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const MIN_YEAR = 2026

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const getToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const isValidDate = (value) => {
  if (!datePattern.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const getMonthEndDate = (year, month) => {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

const normalizeSummary = (summary = {}) => ({
  averageInvoiceValue: Number(summary.averageInvoiceValue || 0),
  firstInvoiceAt: summary.firstInvoiceAt,
  invoiceCount: Number(summary.invoiceCount || 0),
  lastInvoiceAt: summary.lastInvoiceAt,
  totalRevenue: Number(summary.totalRevenue || 0),
})

const buildReport = async ({ startDate, endDate, type, label, breakdownMode = 'daily' }) => {
  const breakdownPromise =
    breakdownMode === 'yearly'
      ? revenueModel.getYearlyBreakdown(Number(startDate.slice(0, 4)), Number(endDate.slice(0, 4)))
      : breakdownMode === 'monthly'
        ? revenueModel.getMonthlyBreakdown(Number(startDate.slice(0, 4)))
        : revenueModel.getDailyBreakdown(startDate, endDate)
  const [summary, dailyBreakdown, recentInvoices, topProducts, hourlyBreakdown] = await Promise.all([
    revenueModel.getRevenueSummary(startDate, endDate),
    breakdownPromise,
    revenueModel.getRecentPaidInvoices(startDate, endDate),
    revenueModel.getTopProducts(startDate, endDate),
    revenueModel.getHourlyBreakdown(startDate, endDate),
  ])

  return {
    breakdown: dailyBreakdown.map((item) => ({
      invoiceCount: Number(item.invoiceCount || 0),
      period: item.period,
      revenue: Number(item.revenue || 0),
    })),
    filters: { endDate, startDate },
    hourlyBreakdown: hourlyBreakdown.map((item) => ({
      hour: Number(item.hour || 0),
      invoiceCount: Number(item.invoiceCount || 0),
      revenue: Number(item.revenue || 0),
    })),
    label,
    recentInvoices,
    summary: normalizeSummary(summary),
    topProducts: topProducts.map((item) => ({
      categoryName: item.categoryName,
      image: item.image,
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity || 0),
      revenue: Number(item.revenue || 0),
    })),
    type,
  }
}

const sendServerError = (res, action, error) => {
  console.error(`[revenue] ${action} failed`, {
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    message: error.message,
  })

  return res.status(500).json({ message: 'Loi server khi tai bao cao doanh thu', error: error.message })
}

const getDailyRevenue = async (req, res) => {
  try {
    const date = normalizeText(req.query.date)

    if (!date) {
      return res.status(400).json({ message: 'Vui long chon ngay can xem doanh thu' })
    }

    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Ngay khong hop le' })
    }

    if (date > getToday()) {
      return res.status(400).json({ message: 'Ngay khong duoc lon hon ngay hien tai' })
    }

    const report = await buildReport({
      endDate: date,
      label: `Doanh thu ngay ${date}`,
      startDate: date,
      type: 'daily',
    })

    return res.json({ report })
  } catch (error) {
    return sendServerError(res, 'get daily revenue', error)
  }
}

const getMonthlyRevenue = async (req, res) => {
  try {
    const month = Number(req.query.month)
    const year = Number(req.query.year)

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Thang phai la so nguyen tu 1 den 12' })
    }

    if (!Number.isInteger(year) || year < MIN_YEAR) {
      return res.status(400).json({ message: `Nam phai la so nguyen lon hon hoac bang ${MIN_YEAR}` })
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = getMonthEndDate(year, month)
    const report = await buildReport({
      endDate,
      label: `Doanh thu thang ${month}/${year}`,
      startDate,
      type: 'monthly',
    })

    return res.json({ report })
  } catch (error) {
    return sendServerError(res, 'get monthly revenue', error)
  }
}

const getYearlyRevenue = async (req, res) => {
  try {
    const year = Number(req.query.year)

    if (!Number.isInteger(year) || year < MIN_YEAR) {
      return res.status(400).json({ message: `Nam phai la so nguyen lon hon hoac bang ${MIN_YEAR}` })
    }

    const report = await buildReport({
      breakdownMode: 'monthly',
      endDate: `${year}-12-31`,
      label: `Doanh thu nam ${year}`,
      startDate: `${year}-01-01`,
      type: 'yearly',
    })

    return res.json({ report })
  } catch (error) {
    return sendServerError(res, 'get yearly revenue', error)
  }
}

const getYearsRevenue = async (req, res) => {
  try {
    const startYear = Number(req.query.startYear || MIN_YEAR)
    const endYear = Number(req.query.endYear || new Date().getFullYear())

    if (!Number.isInteger(startYear) || startYear < MIN_YEAR) {
      return res.status(400).json({ message: `Nam bat dau phai lon hon hoac bang ${MIN_YEAR}` })
    }

    if (!Number.isInteger(endYear) || endYear < startYear) {
      return res.status(400).json({ message: 'Nam ket thuc phai lon hon hoac bang nam bat dau' })
    }

    const report = await buildReport({
      breakdownMode: 'yearly',
      endDate: `${endYear}-12-31`,
      label: `Doanh thu tu nam ${startYear} den ${endYear}`,
      startDate: `${startYear}-01-01`,
      type: 'years',
    })

    return res.json({ report })
  } catch (error) {
    return sendServerError(res, 'get years revenue', error)
  }
}

const getRangeRevenue = async (req, res) => {
  try {
    const startDate = normalizeText(req.query.startDate)
    const endDate = normalizeText(req.query.endDate)

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Vui long chon ngay bat dau va ngay ket thuc' })
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({ message: 'Khoang thoi gian khong hop le' })
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'Ngay bat dau phai nho hon hoac bang ngay ket thuc' })
    }

    const report = await buildReport({
      endDate,
      label: `Doanh thu tu ${startDate} den ${endDate}`,
      startDate,
      type: 'range',
    })

    return res.json({ report })
  } catch (error) {
    return sendServerError(res, 'get range revenue', error)
  }
}

module.exports = {
  getDailyRevenue,
  getMonthlyRevenue,
  getRangeRevenue,
  getYearsRevenue,
  getYearlyRevenue,
}
