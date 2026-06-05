import { AlertTriangle, Banknote, BarChart2, Calendar, Clock, PackageOpen, ReceiptText, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { getDailyRevenue } from '../../services/revenueService'
import { formatCurrency } from '../../utils/formatCurrency'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const getLocalDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const today = getLocalDate()

const getImageUrl = (image) => {
  if (!image) return null
  if (/^https?:\/\//i.test(image)) return image
  return `${API_ORIGIN}${image}`
}

const STATUS_LABEL = { Paid: 'Đã TT', Completed: 'Hoàn thành', Unpaid: 'Chưa TT', Cancelled: 'Đã hủy' }
const STATUS_CLASS = { Paid: 'dash-chip-paid', Completed: 'dash-chip-paid', Unpaid: 'dash-chip-unpaid', Cancelled: 'dash-chip-cancel' }

const buildSmoothPath = (points) =>
  points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx1 = prev.x + (p.x - prev.x) / 3
    const cx2 = prev.x + (2 * (p.x - prev.x)) / 3
    return `C ${cx1} ${prev.y} ${cx2} ${p.y} ${p.x} ${p.y}`
  }).join(' ')

const VBW = 600
const VBH = 150
const PAD_X = 8
const PAD_Y = 16

function OverviewSection({
  chartData,
  inventoryAlerts,
  loading,
  monthlyRevenue,
  recentInvoices,
  shiftEmployees,
  stats,
  topProducts,
  yearlyRevenue,
}) {
  const [hourlyData, setHourlyData] = useState([])

  useEffect(() => {
    getDailyRevenue(today)
      .then((data) => setHourlyData(data.report?.hourlyBreakdown || []))
      .catch(() => setHourlyData([]))
  }, [])

  const todayStat    = stats[0] || {}
  const invoiceStat  = stats[1] || {}
  const stockStat    = stats[2] || {}

  const todayRevenue  = Number(todayStat.value || 0)
  const todayInvoices = Number(invoiceStat.value || 0)
  const stockAlerts   = Number(stockStat.value || 0)

  const kpis = [
    {
      accent: 'dash-k-revenue',
      desc: `${todayInvoices} hóa đơn hôm nay`,
      icon: Banknote,
      label: 'Doanh thu hôm nay',
      value: formatCurrency(todayRevenue),
    },
    {
      accent: 'dash-k-month',
      desc: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      icon: Calendar,
      label: 'Doanh thu tháng',
      value: formatCurrency(Number(monthlyRevenue || 0)),
    },
    {
      accent: 'dash-k-year',
      desc: `Năm ${new Date().getFullYear()}`,
      icon: BarChart2,
      label: 'Doanh thu năm',
      value: formatCurrency(Number(yearlyRevenue || 0)),
    },
    {
      accent: stockAlerts > 0 ? 'dash-k-alert' : 'dash-k-safe',
      desc: stockStat.note || 'Kho ổn định',
      icon: PackageOpen,
      label: 'Cảnh báo kho',
      value: stockAlerts,
    },
  ]

  // --- Revenue chart (7 days) ---
  const maxAmt = Math.max(...chartData.map((d) => d.amount), 1)
  const chartPoints = chartData.map((d, i) => ({
    amount: d.amount,
    label: d.label,
    x: PAD_X + (i / Math.max(chartData.length - 1, 1)) * (VBW - PAD_X * 2),
    y: PAD_Y + (1 - d.amount / maxAmt) * (VBH - PAD_Y * 2),
  }))
  const linePath = buildSmoothPath(chartPoints)
  const last  = chartPoints[chartPoints.length - 1]
  const first = chartPoints[0]
  const areaPath = linePath && last && first
    ? `${linePath} L ${last.x} ${VBH} L ${first.x} ${VBH} Z`
    : ''

  // --- Hourly peak ---
  const peakHour = hourlyData.reduce(
    (best, h) => (Number(h.invoiceCount || 0) > Number(best?.invoiceCount || 0) ? h : best),
    null
  )
  const maxHourly = Math.max(...hourlyData.map((h) => Number(h.invoiceCount || 0)), 1)
  const displayHours = Array.from({ length: 17 }, (_, i) => {
    const hr = i + 6
    const found = hourlyData.find((h) => Number(h.hour) === hr)
    return { hour: hr, invoiceCount: Number(found?.invoiceCount || 0), revenue: Number(found?.revenue || 0) }
  })

  // --- Top products ---
  const maxQty = Math.max(...topProducts.map((p) => p.quantity), 1)

  return (
    <div className="dash-root">

      {/* ── Row 1: KPI cards ── */}
      <div className="dash-kpi-row">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <article className={`dash-kpi-card ${kpi.accent}`} key={kpi.label}>
              <div className="dash-kpi-icon-wrap"><Icon aria-hidden="true" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">{kpi.label}</span>
                <strong className="dash-kpi-value">{loading ? '…' : kpi.value}</strong>
                <small className="dash-kpi-desc">{kpi.desc}</small>
              </div>
            </article>
          )
        })}
      </div>

      {/* ── Row 2: Chart + Peak hours ── */}
      <div className="dash-main-row">
        <article className="dash-card dash-chart-card">
          <header className="dash-card-hd">
            <div>
              <h3>Doanh thu 7 ngày gần nhất</h3>
              <p>Hóa đơn đã thanh toán &amp; hoàn thành</p>
            </div>
            <span className="dash-total-badge">{formatCurrency(chartData.reduce((s, d) => s + d.amount, 0))}</span>
          </header>
          <div className="dash-chart-body">
            {chartData.length === 0 ? (
              <p className="dash-empty">Chưa có dữ liệu</p>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  className="dash-svg"
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${VBW} ${VBH}`}
                >
                  <defs>
                    <linearGradient id="dash-fill-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6B3A2A" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#6B3A2A" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#dash-fill-grad)" />
                  <path className="dash-svg-line" d={linePath} />
                  {chartPoints.map((p) => (
                    <g key={p.label}>
                      <circle className="dash-svg-dot-bg" cx={p.x} cy={p.y} r="6" />
                      <circle className="dash-svg-dot" cx={p.x} cy={p.y} r="4" />
                    </g>
                  ))}
                </svg>
                <div className="dash-chart-labels">
                  {chartData.map((d, i) => (
                    <span key={i}>{d.label}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </article>

        <article className="dash-card dash-peak-card">
          <header className="dash-card-hd">
            <div>
              <h3><Clock size={14} aria-hidden="true" /> Giờ cao điểm</h3>
              <p>Hôm nay · {today}</p>
            </div>
          </header>
          <div className="dash-peak-body">
            {peakHour ? (
              <div className="dash-peak-highlight">
                <span>Cao điểm nhất</span>
                <strong>{String(peakHour.hour).padStart(2, '0')}:00 – {String(Number(peakHour.hour) + 1).padStart(2, '0')}:00</strong>
                <div className="dash-peak-meta">
                  <span>{peakHour.invoiceCount} hóa đơn</span>
                  <span>{formatCurrency(peakHour.revenue)}</span>
                </div>
              </div>
            ) : (
              <p className="dash-empty">Chưa có đơn hàng hôm nay.</p>
            )}
          </div>
        </article>
      </div>

      {/* ── Row 3: Top products + Employees + Stock alerts ── */}
      <div className="dash-row3">
        <article className="dash-card dash-products-card">
          <header className="dash-card-hd">
            <h3>Top món hôm nay</h3>
            <span className="dash-live">● Live</span>
          </header>
          {topProducts.length === 0 ? (
            <p className="dash-empty">Chưa có đơn hàng hôm nay.</p>
          ) : (
            <ul className="dash-product-list">
              {topProducts.slice(0, 5).map((product, idx) => {
                const imgUrl = getImageUrl(product.image)
                const pct = Math.round((product.quantity / maxQty) * 100)
                return (
                  <li className="dash-product-row" key={product.name}>
                    <span className={`dash-rank dash-rank-${Math.min(idx + 1, 4)}`}>#{idx + 1}</span>
                    <div className="dash-thumb">
                      {imgUrl
                        ? <img alt={product.name} src={imgUrl} />
                        : <span>☕</span>}
                    </div>
                    <div className="dash-product-info">
                      <strong>{product.name}</strong>
                      {product.categoryName && <small>{product.categoryName}</small>}
                      <div className="dash-bar-track">
                        <div className="dash-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="dash-qty-badge">{product.quantity}<em>ly</em></span>
                  </li>
                )
              })}
            </ul>
          )}
        </article>

        <article className="dash-card dash-staff-card">
          <header className="dash-card-hd">
            <h3><Users size={14} aria-hidden="true" /> Nhân viên đang trong ca</h3>
          </header>
          {shiftEmployees.length === 0 ? (
            <p className="dash-empty">Chưa có nhân viên đang trong ca.</p>
          ) : (
            <ul className="dash-staff-list">
              {shiftEmployees.slice(0, 6).map((emp) => (
                <li className="dash-staff-row" key={emp.id || emp.accountId || emp.fullName}>
                  <div className="dash-avatar">
                    {String(emp.fullName || emp.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="dash-staff-info">
                    <strong>{emp.fullName || emp.username}</strong>
                    <small>{emp.position || emp.workShift || 'Đang ca'}</small>
                  </div>
                  <span className="dash-online-dot" />
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dash-card dash-alerts-card">
          <header className="dash-card-hd">
            <h3><AlertTriangle size={14} aria-hidden="true" /> Cảnh báo kho</h3>
          </header>
          {inventoryAlerts.length === 0 ? (
            <p className="dash-empty dash-ok">✓ Kho ổn định</p>
          ) : (
            <ul className="dash-alert-list">
              {inventoryAlerts.slice(0, 6).map((item) => {
                const qty = Number(item.currentStock ?? item.quantity ?? 0)
                return (
                  <li className="dash-alert-row" key={item.id || item.name || item.ingredientName}>
                    <span className="dash-alert-dot" />
                    <span className="dash-alert-name">{item.name || item.ingredientName}</span>
                    <strong className="dash-alert-qty">
                      {Number.isInteger(qty) ? qty : qty.toFixed(1)} {item.unit || ''}
                    </strong>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      </div>

      {/* ── Row 4: Recent invoices ── */}
      <article className="dash-card dash-invoices-card">
        <header className="dash-card-hd">
          <div>
            <h3><ReceiptText size={14} aria-hidden="true" /> Hóa đơn gần đây</h3>
          </div>
        </header>
        <div className="dash-invoice-wrap">
          {recentInvoices.length === 0 ? (
            <p className="dash-empty">Chưa có hóa đơn.</p>
          ) : (
            <table className="dash-invoice-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.slice(0, 8).map((inv) => (
                  <tr key={inv.id}>
                    <td className="dash-inv-code">{inv.code || `#${inv.id}`}</td>
                    <td>
                      <span className={`dash-chip ${STATUS_CLASS[inv.status] || ''}`}>
                        {STATUS_LABEL[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="dash-inv-amount">{formatCurrency(Number(inv.totalAmount || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </article>

    </div>
  )
}

OverviewSection.propTypes = {
  chartData: PropTypes.arrayOf(PropTypes.object).isRequired,
  inventoryAlerts: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  monthlyRevenue: PropTypes.number.isRequired,
  recentInvoices: PropTypes.arrayOf(PropTypes.object).isRequired,
  shiftEmployees: PropTypes.arrayOf(PropTypes.object).isRequired,
  stats: PropTypes.arrayOf(PropTypes.object).isRequired,
  topProducts: PropTypes.arrayOf(PropTypes.object).isRequired,
  yearlyRevenue: PropTypes.number.isRequired,
}

export default OverviewSection
