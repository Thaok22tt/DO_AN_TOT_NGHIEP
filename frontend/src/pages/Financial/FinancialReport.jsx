import { Banknote, Loader2, Package, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMonthlyFinancialReport } from '../../services/financialService'
import { getErrorMessage } from '../../utils/adminUtils'
import { formatCurrency } from '../../utils/formatCurrency'

const now = new Date()
const currentMonth = now.getMonth() + 1
const currentYear = now.getFullYear()

const formatVND = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

const formatDate = (dateStr) => {
  const [, , day] = String(dateStr || '').split('-')
  return day ? `${day}` : dateStr
}


function FinancialReport() {
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport(month, year)
    }, 300)
    return () => clearTimeout(timer)
  }, [month, year])

  const fetchReport = async (m, y) => {
    setLoading(true)
    setError('')
    try {
      const data = await getMonthlyFinancialReport({ month: m, year: y })
      setReport(data.report)
    } catch (err) {
      setError(getErrorMessage(err))
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const summary = report?.summary || {}
  const dailyBreakdown = report?.dailyBreakdown || []
  const maxRevenue = Math.max(...dailyBreakdown.map((d) => d.revenue), 1)
  const maxMetric = Math.max(
    Number(summary.totalRevenue || 0),
    Number(summary.totalStockCost || 0),
    Number(summary.totalSalary || 0),
    Math.abs(Number(summary.profit || 0)),
    1
  )

  const kpis = [
    {
      accent: 'fin-revenue',
      detail: `${summary.invoiceCount ?? 0} hóa đơn`,
      icon: Banknote,
      label: 'Doanh thu',
      value: formatVND(summary.totalRevenue),
    },
    {
      accent: 'fin-stock',
      detail: 'Chi phí nhập nguyên liệu',
      icon: Package,
      label: 'Chi phí nhập kho',
      value: formatVND(summary.totalStockCost),
    },
    {
      accent: 'fin-salary',
      detail: 'Tính từ giờ làm × lương/giờ',
      icon: Users,
      label: 'Lương nhân viên',
      value: formatVND(summary.totalSalary),
    },
    {
      accent: Number(summary.profit || 0) >= 0 ? 'fin-profit' : 'fin-loss',
      detail: 'Doanh thu − Chi phí − Lương',
      icon: TrendingUp,
      label: 'Lợi nhuận',
      value: formatVND(summary.profit),
    },
  ]

  const comparisonBars = [
    { color: 'var(--fin-revenue)', label: 'Doanh thu', value: Number(summary.totalRevenue || 0) },
    { color: 'var(--fin-stock)', label: 'Chi phí kho', value: Number(summary.totalStockCost || 0) },
    { color: 'var(--fin-salary)', label: 'Lương NV', value: Number(summary.totalSalary || 0) },
    {
      color: Number(summary.profit || 0) >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)',
      label: 'Lợi nhuận',
      value: Math.abs(Number(summary.profit || 0)),
    },
  ]

  return (
    <section className="financial-report">
      {/* Filter bar */}
      <div className="financial-filter-bar">
        <div className="financial-filter-controls">
          <label className="financial-filter-field">
            <span>Tháng</span>
            <select onChange={(e) => setMonth(Number(e.target.value))} value={month}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
          </label>
          <label className="financial-filter-field">
            <span>Năm</span>
            <input
              max={currentYear + 1}
              min={2020}
              onChange={(e) => setYear(Number(e.target.value))}
              type="number"
              value={year}
            />
          </label>
          {loading && (
            <span className="financial-loading-badge">
              <Loader2 aria-hidden="true" />
              Đang tải...
            </span>
          )}
        </div>
      </div>

      {error && <div className="financial-error">{error}</div>}

      {/* KPI cards */}
      <div className="financial-kpi-grid">
        {kpis.map((card) => {
          const Icon = card.icon
          return (
            <article className={`financial-kpi-card ${card.accent}`} key={card.label}>
              <div className="financial-kpi-top">
                <span>{card.label}</span>
                <span className="financial-kpi-icon"><Icon aria-hidden="true" /></span>
              </div>
              <strong className="financial-kpi-value">
                {loading ? '—' : card.value}
              </strong>
              <small className="financial-kpi-detail">{card.detail}</small>
            </article>
          )
        })}
      </div>

      {/* Daily revenue chart */}
      <article className="financial-chart-card">
        <header className="financial-card-header">
          <div>
            <h3>Doanh thu theo ngày</h3>
            <p>
              Tháng {month}/{year} · chỉ tính hóa đơn Đã thanh toán / Hoàn thành
            </p>
          </div>
        </header>
        <div className="financial-bar-chart">
          {dailyBreakdown.length === 0 ? (
            <div className="financial-empty">Không có dữ liệu</div>
          ) : (
            <>
              <div className="financial-bar-y">
                <span>{formatCurrency(maxRevenue)}</span>
                <span>{formatCurrency(maxRevenue / 2)}</span>
                <span>0</span>
              </div>
              <div className="financial-bar-track">
                {dailyBreakdown.map((day) => {
                  const pct = Math.max(day.revenue > 0 ? 6 : 1, (day.revenue / maxRevenue) * 100)
                  return (
                    <div
                      className="financial-bar-col"
                      key={day.date}
                      title={`${day.date}: ${formatVND(day.revenue)} · ${day.invoiceCount} HĐ`}
                    >
                      <div className="financial-bar-wrap">
                        <i
                          className={`financial-bar-fill${day.invoiceCount === 0 ? ' empty' : ''}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span>{formatDate(day.date)}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </article>

      {/* Comparison chart */}
      <article className="financial-chart-card">
        <header className="financial-card-header">
          <div>
            <h3>So sánh các chỉ tiêu tháng {month}/{year}</h3>
            <p>Doanh thu · Chi phí nhập kho · Lương nhân viên · Lợi nhuận</p>
          </div>
        </header>
        <div className="financial-comparison">
          {comparisonBars.map((bar) => (
            <div className="financial-comparison-row" key={bar.label}>
              <span className="financial-comparison-label">{bar.label}</span>
              <div className="financial-comparison-track">
                <div
                  className="financial-comparison-fill"
                  style={{
                    background: bar.color,
                    width: `${Math.max(bar.value > 0 ? 4 : 0, (bar.value / maxMetric) * 100)}%`,
                  }}
                />
              </div>
              <span className="financial-comparison-value">{loading ? '—' : formatVND(bar.value)}</span>
            </div>
          ))}
        </div>
      </article>

      {/* Detail table */}
      <article className="financial-chart-card">
        <header className="financial-card-header">
          <div>
            <h3>Chi tiết theo ngày</h3>
            <p>Tháng {month}/{year} · {dailyBreakdown.length} ngày</p>
          </div>
        </header>
        <div className="financial-table-wrap">
          <table className="financial-table">
            <colgroup>
              <col style={{ width: '110px' }} />
              <col style={{ width: '70px' }} />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>Ngày</th>
                <th style={{ textAlign: 'center' }}>Số HĐ</th>
                <th style={{ textAlign: 'right' }}>Doanh thu</th>
                <th style={{ textAlign: 'right' }}>Chi phí kho</th>
                <th style={{ textAlign: 'right' }}>Lương NV</th>
                <th style={{ textAlign: 'right' }}>Lợi nhuận</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="financial-table-empty" colSpan="6">Đang tải...</td>
                </tr>
              ) : dailyBreakdown.length === 0 ? (
                <tr>
                  <td className="financial-table-empty" colSpan="6">Không có dữ liệu</td>
                </tr>
              ) : (
                <>
                  {dailyBreakdown.map((day) => (
                    <tr key={day.date}>
                      <td className="financial-date-cell">{day.date}</td>
                      <td style={{ textAlign: 'center' }}>{day.invoiceCount}</td>
                      <td className="financial-money">{formatVND(day.revenue)}</td>
                      <td className="financial-money stock">{formatVND(day.stockCost)}</td>
                      <td className="financial-money salary">{formatVND(day.salary)}</td>
                      <td className={`financial-money ${day.profit >= 0 ? 'profit' : 'loss'}`}>
                        {formatVND(day.profit)}
                      </td>
                    </tr>
                  ))}
                  <tr className="financial-table-total">
                    <td><strong>Tổng tháng</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{summary.invoiceCount ?? 0}</strong></td>
                    <td className="financial-money"><strong>{formatVND(summary.totalRevenue)}</strong></td>
                    <td className="financial-money stock"><strong>{formatVND(summary.totalStockCost)}</strong></td>
                    <td className="financial-money salary"><strong>{formatVND(summary.totalSalary)}</strong></td>
                    <td className={`financial-money ${Number(summary.profit || 0) >= 0 ? 'profit' : 'loss'}`}>
                      <strong>{formatVND(summary.profit)}</strong>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

export default FinancialReport
