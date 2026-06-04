import { BarChart3, CalendarDays, Clock3, Download, FileSpreadsheet, PiggyBank, ReceiptText, Trophy, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import AdminAlert from '../../components/common/AdminAlert'
import DateInput from '../../components/common/DateInput'
import {
  getMonthlyRevenue,
  getRangeRevenue,
  getDailyRevenue,
  getYearsRevenue,
  getYearlyRevenue,
} from '../../services/revenueService'
import { getErrorMessage } from '../../utils/adminUtils'
import { formatDate } from '../../utils/formatDate'
import { sanitizeIntegerInput } from '../../utils/formatCurrency'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

const getLocalDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const today = getLocalDate()
const minYear = 2026

const reportModes = [
  { key: 'daily', label: 'Ngày' },
  { key: 'monthly', label: 'Tháng' },
  { key: 'yearly', label: 'Năm' },
  { key: 'range', label: 'Khoảng' },
]

const getDefaultForm = () => ({
  date: today,
  endDate: today,
  endYear: String(Math.max(currentYear, minYear)),
  month: String(new Date().getMonth() + 1),
  startDate: today,
  startYear: String(minYear),
  year: String(Math.max(currentYear, minYear)),
})

const getPeriodLabel = (mode, period) => {
  if (mode === 'monthly') return `Tháng ${period}`
  if (mode === 'yearly') return String(period)

  const [, month, day] = String(period).slice(0, 10).split('-')
  return day && month ? `${day}/${month}` : String(period)
}

const getVietnameseDateLabel = (dateString) => {
  const date = dateString ? new Date(`${dateString}T00:00:00`) : new Date()
  const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

  return `${weekdays[date.getDay()]}, ${date.toLocaleDateString('vi-VN')}`
}

const getShortDateLabel = (dateString) => {
  const [year, month, day] = String(dateString || '').slice(0, 10).split('-')

  return day && month && year ? `${day}/${month}/${year}` : String(dateString || '')
}

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate()

const getPeriodKey = (mode, period) => {
  if (mode === 'monthly' || mode === 'yearly') return String(period)

  return String(period).slice(0, 10)
}

const buildCompleteBreakdown = ({ form, mode, report }) => {
  const rows = report?.breakdown || []
  const rowMap = new Map(rows.map((item) => [getPeriodKey(mode, item.period), item]))

  if (mode === 'daily') {
    const year = Number(form.year)
    const month = Number(form.month)
    const monthText = String(month).padStart(2, '0')

    return Array.from({ length: getDaysInMonth(year, month) }, (_, index) => {
      const day = String(index + 1).padStart(2, '0')
      const period = `${year}-${monthText}-${day}`
      const existing = rowMap.get(period)

      return {
        invoiceCount: Number(existing?.invoiceCount || 0),
        period,
        revenue: Number(existing?.revenue || 0),
      }
    })
  }

  if (mode === 'monthly') {
    return Array.from({ length: 12 }, (_, index) => {
      const period = String(index + 1)
      const existing = rowMap.get(period)

      return {
        invoiceCount: Number(existing?.invoiceCount || 0),
        period,
        revenue: Number(existing?.revenue || 0),
      }
    })
  }

  if (mode === 'yearly') {
    const startYear = Number(form.startYear)
    const endYear = Number(form.endYear)

    return Array.from({ length: Math.max(endYear - startYear + 1, 0) }, (_, index) => {
      const period = String(startYear + index)
      const existing = rowMap.get(period)

      return {
        invoiceCount: Number(existing?.invoiceCount || 0),
        period,
        revenue: Number(existing?.revenue || 0),
      }
    })
  }

  return rows
}

const formatAxisMoney = (value) => {
  const amount = Number(value || 0)

  if (!Number.isNaN(amount)) return amount.toLocaleString('vi-VN')

  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0', '')}tr`
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`
  return `${amount.toLocaleString('vi-VN')} đ`
}

const formatVND = (value) => {
  const amount = Number(value || 0)

  if (!Number.isNaN(amount)) return `${amount.toLocaleString('vi-VN')} ₫`

  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0', '')} tr ₫`
  if (amount >= 1000) return `${Math.round(amount / 1000)}K ₫`
  return `${amount.toLocaleString('vi-VN')} ₫`
}

const getProductImageUrl = (image) => {
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image

  return `${API_ORIGIN}${image}`
}

const getHourGroupRows = (hourlyBreakdown = []) => {
  const groups = [
    { label: 'Sáng (7-9h)', maxHour: 9, minHour: 7 },
    { label: 'Trưa (11-13h)', maxHour: 13, minHour: 11 },
    { label: 'Chiều (14-16h)', maxHour: 16, minHour: 14 },
    { label: 'Tối (18-21h)', maxHour: 21, minHour: 18 },
  ].map((group) => {
    const rows = hourlyBreakdown.filter((item) => Number(item.hour) >= group.minHour && Number(item.hour) <= group.maxHour)
    const invoiceCount = rows.reduce((sum, item) => sum + Number(item.invoiceCount || 0), 0)
    const revenue = rows.reduce((sum, item) => sum + Number(item.revenue || 0), 0)

    return {
      ...group,
      invoiceCount,
      rangeLabel: `${String(group.minHour).padStart(2, '0')}:00-${String(group.maxHour).padStart(2, '0')}:00`,
      revenue,
    }
  })
  const maxInvoices = Math.max(...groups.map((group) => group.invoiceCount), 1)

  return groups.map((group) => ({
    ...group,
    level: group.invoiceCount === 0 ? 'Thấp' : group.invoiceCount === maxInvoices ? 'Cao nhất' : group.invoiceCount >= maxInvoices * 0.7 ? 'Cao' : group.invoiceCount >= maxInvoices * 0.4 ? 'Trung bình' : 'Thấp',
    percent: Math.max(8, Math.round((group.invoiceCount / maxInvoices) * 100)),
  }))
}

const getHourlyRows = (hourlyBreakdown = []) => {
  const rowMap = new Map(hourlyBreakdown.map((item) => [Number(item.hour), item]))
  const rows = Array.from({ length: 17 }, (_, index) => {
    const hour = index + 6
    const existing = rowMap.get(hour)

    return {
      hour,
      invoiceCount: Number(existing?.invoiceCount || 0),
      label: `${hour}h`,
      rangeLabel: `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:00`,
      revenue: Number(existing?.revenue || 0),
    }
  })
  const maxInvoices = Math.max(...rows.map((item) => item.invoiceCount), 1)
  const highThreshold = Math.max(Math.ceil(maxInvoices * 0.7), 1)
  const normalThreshold = Math.max(Math.ceil(maxInvoices * 0.35), 1)

  return rows.map((item) => ({
    ...item,
    level: item.invoiceCount >= highThreshold ? 'high' : item.invoiceCount >= normalThreshold ? 'normal' : 'low',
    percent: Math.max(item.invoiceCount ? 8 : 2, Math.round((item.invoiceCount / maxInvoices) * 100)),
  }))
}

// eslint-disable-next-line no-unused-vars
const getPeakCards = (hourlyRows = []) => {
  const sorted = [...hourlyRows].sort((a, b) => b.invoiceCount - a.invoiceCount)
  const low = [...hourlyRows].sort((a, b) => a.invoiceCount - b.invoiceCount)[0]
  const total = hourlyRows.reduce((sum, item) => sum + item.invoiceCount, 0)

  return [
    { accent: true, label: 'Cao điểm 1', range: sorted[0]?.rangeLabel || '--', value: `${sorted[0]?.invoiceCount || 0} hóa đơn/giờ` },
    { accent: true, label: 'Cao điểm 2', range: sorted[1]?.rangeLabel || '--', value: `${sorted[1]?.invoiceCount || 0} hóa đơn/giờ` },
    { label: 'Thấp điểm', range: low?.rangeLabel || '--', value: `${low?.invoiceCount || 0} hóa đơn/giờ` },
    { label: 'Tổng trong ngày', range: total.toLocaleString('vi-VN'), value: 'hóa đơn' },
  ]
}

const exportRevenueCsv = (report) => {
  if (!report) return

  const summaryRows = [
    ['Tong doanh thu', report.summary?.totalRevenue || 0],
    ['Hoa don da thanh toan', report.summary?.invoiceCount || 0],
    ['Trung binh hoa don', report.summary?.averageInvoiceValue || 0],
    ['Tu ngay', report.filters?.startDate || ''],
    ['Den ngay', report.filters?.endDate || ''],
  ]
  const breakdownRows = [['Ky bao cao', 'Doanh thu'], ...(report.breakdown || []).map((item) => [item.period, item.revenue])]
  const csv = [...summaryRows, [], ...breakdownRows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `doanh-thu-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function Report() {
  const [mode, setMode] = useState('daily')
  const [form, setForm] = useState(getDefaultForm)
  const [report, setReport] = useState(null)
  const [todayKpi, setTodayKpi] = useState(null)
  const [thisMonthKpi, setThisMonthKpi] = useState(null)
  const [selectedPeakDate, setSelectedPeakDate] = useState(today)
  const [selectedPeakReport, setSelectedPeakReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const peakCardRef = useRef(null)

  const summary = report?.summary || {}
  const totalRevenue = Number(summary.totalRevenue || 0)
  const displayBreakdown = useMemo(() => buildCompleteBreakdown({ form, mode, report }), [form, mode, report])

  const maxChartValue = useMemo(() => {
    return Math.max(...displayBreakdown.map((item) => Number(item.revenue || 0)), 1)
  }, [displayBreakdown])
  const axisTicks = [maxChartValue, maxChartValue * 0.75, maxChartValue * 0.5, maxChartValue * 0.25, 0]

  const peakHourlyBreakdown = useMemo(() => selectedPeakReport?.hourlyBreakdown || report?.hourlyBreakdown || [], [report, selectedPeakReport])
  const hourlyRows = useMemo(() => getHourlyRows(peakHourlyBreakdown), [peakHourlyBreakdown])
  const peakHour = useMemo(() => {
    return peakHourlyBreakdown.reduce((best, item) => (Number(item.invoiceCount || 0) > Number(best?.invoiceCount || 0) ? item : best), null)
  }, [peakHourlyBreakdown])
  const hourGroupRows = useMemo(() => getHourGroupRows(peakHourlyBreakdown), [peakHourlyBreakdown])
  const peakLineChart = useMemo(() => {
    const width = 960
    const height = 260
    const padding = 28
    const maxInvoices = Math.max(...hourlyRows.map((row) => row.invoiceCount), 1)
    const step = hourlyRows.length > 1 ? width / (hourlyRows.length - 1) : width
    const points = hourlyRows.map((row, index) => {
      const ratio = Number(row.invoiceCount || 0) / maxInvoices

      return {
        ...row,
        x: index * step,
        y: height - padding - (ratio * (height - padding * 2)),
      }
    })
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    const areaPath = points.length ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : ''
    const segments = points.slice(1).map((point, index) => {
      const previous = points[index]

      return {
        direction: point.invoiceCount < previous.invoiceCount ? 'down' : 'up',
        id: `${previous.rangeLabel}-${point.rangeLabel}`,
        path: `M ${previous.x} ${previous.y} L ${point.x} ${point.y}`,
      }
    })

    return { areaPath, height, maxInvoices, path, points, segments, width }
  }, [hourlyRows])
  const peakSubtitle = selectedPeakReport
    ? `Hoạt động 6:00 – 22:00 · ${getVietnameseDateLabel(selectedPeakDate)}`
    : `Hoạt động 6:00 – 22:00 · ${report?.label || 'Dữ liệu theo kỳ đang chọn'}`

  const revenueChartTitle = useMemo(() => {
    if (mode === 'daily') return `Doanh thu các ngày tháng ${Number(form.month)}/${form.year}`
    if (mode === 'monthly') return `Doanh thu các tháng trong năm ${form.year}`
    if (mode === 'yearly') {
      return form.startYear === form.endYear
        ? `Doanh thu trong năm ${form.startYear}`
        : `Doanh thu từ năm ${form.startYear} đến năm ${form.endYear}`
    }

    return `Doanh thu từ ${getShortDateLabel(form.startDate)} đến ${getShortDateLabel(form.endDate)}`
  }, [form, mode])

  const kpis = [
    {
      accent: 'revenue',
      detail: todayKpi ? `${todayKpi.invoiceCount} hóa đơn` : '—',
      icon: WalletCards,
      label: 'Hôm nay',
      value: todayKpi ? formatVND(todayKpi.totalRevenue) : '—',
    },
    {
      accent: 'orders',
      detail: thisMonthKpi ? `${thisMonthKpi.invoiceCount} hóa đơn` : '—',
      icon: CalendarDays,
      label: `Tháng ${currentMonth}/${currentYear}`,
      value: thisMonthKpi ? formatVND(thisMonthKpi.totalRevenue) : '—',
    },
    {
      accent: 'cost',
      detail: `${summary.invoiceCount ?? 0} hóa đơn`,
      icon: ReceiptText,
      label: 'Kỳ đang xem',
      value: formatVND(totalRevenue),
    },
    {
      accent: 'profit',
      detail: report?.label || 'Chọn kỳ báo cáo',
      icon: PiggyBank,
      label: 'Trung bình/đơn',
      value: formatVND(summary.averageInvoiceValue ?? 0),
    },
  ]

  const validateForm = () => {
    if (mode === 'daily') {
      const month = Number(form.month)
      const year = Number(form.year)

      if (!Number.isInteger(month) || month < 1 || month > 12) return 'Tháng phải là số nguyên từ 1 đến 12'
      if (!Number.isInteger(year) || year < minYear) return `Năm phải lớn hơn hoặc bằng ${minYear}`
    }

    if (mode === 'monthly') {
      const year = Number(form.year)
      if (!Number.isInteger(year) || year < minYear) return `Năm phải lớn hơn hoặc bằng ${minYear}`
    }

    if (mode === 'yearly') {
      const startYear = Number(form.startYear)
      const endYear = Number(form.endYear)

      if (!Number.isInteger(startYear) || startYear < minYear) return `Năm bắt đầu phải lớn hơn hoặc bằng ${minYear}`
      if (!Number.isInteger(endYear) || endYear < startYear) return 'Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu'
    }

    if (mode === 'range') {
      if (!form.startDate || !form.endDate) return 'Vui lòng chọn ngày bắt đầu và ngày kết thúc'
      if (form.startDate > form.endDate) return 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
    }

    return ''
  }

  const fetchReport = async () => {
    const validationMessage = validateForm()

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data =
        mode === 'daily'
          ? await getMonthlyRevenue({ month: form.month, year: form.year })
          : mode === 'monthly'
            ? await getYearlyRevenue(form.year)
            : mode === 'yearly'
              ? await getYearsRevenue({ endYear: form.endYear, startYear: form.startYear })
              : await getRangeRevenue({ startDate: form.startDate, endDate: form.endDate })

      setReport(data.report)
      setSelectedPeakReport(null)
      setSelectedPeakDate(data.report?.filters?.startDate || today)
    } catch (reportError) {
      setReport(null)
      setError(getErrorMessage(reportError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport()
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, form.month, form.year, form.startYear, form.endYear, form.startDate, form.endDate])

  useEffect(() => {
    const loadKpis = () => {
      getDailyRevenue(today)
        .then((data) => setTodayKpi(data.report?.summary || null))
        .catch(() => setTodayKpi(null))

      getMonthlyRevenue({ month: currentMonth, year: currentYear })
        .then((data) => setThisMonthKpi(data.report?.summary || null))
        .catch(() => setThisMonthKpi(null))
    }

    loadKpis()
    const interval = setInterval(loadKpis, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const updateForm = (event) => {
    const { name, value } = event.target
    const numericFields = ['month', 'year', 'startYear', 'endYear']
    setForm((current) => ({ ...current, [name]: numericFields.includes(name) ? sanitizeIntegerInput(value) : value }))
  }

  const fetchPeakByDate = async (date) => {
    if (!date) return

    setSelectedPeakDate(date)

    try {
      const data = await getDailyRevenue(date)
      setSelectedPeakReport(data.report)
    } catch (peakError) {
      setSelectedPeakReport(null)
      setError(getErrorMessage(peakError))
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    fetchReport()
  }

  return (
    <section className="admin-revenue revenue-dashboard">
      <div className="revenue-action-head">
        <div>
          <p>Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {formatDate(today)}</p>
          <form className="revenue-filter-panel" onSubmit={handleSubmit}>
            <div className="revenue-mode-toggle" role="tablist" aria-label="Chế độ báo cáo doanh thu">
              {reportModes.map((item) => (
                <button
                  className={mode === item.key ? 'active' : ''}
                  key={item.key}
                  onClick={() => {
                    setReport(null)
                    setMode(item.key)
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="revenue-date-controls">
              {mode === 'daily' && (
                <>
                  <input aria-label="Tháng" inputMode="numeric" maxLength="2" name="month" onChange={updateForm} required type="text" value={form.month} />
                  <input aria-label="Năm" inputMode="numeric" maxLength="4" name="year" onChange={updateForm} required type="text" value={form.year} />
                </>
              )}
              {mode === 'monthly' && <input aria-label="Năm" inputMode="numeric" maxLength="4" name="year" onChange={updateForm} required type="text" value={form.year} />}
              {mode === 'yearly' && (
                <>
                  <input aria-label="Từ năm" inputMode="numeric" maxLength="4" name="startYear" onChange={updateForm} required type="text" value={form.startYear} />
                  <input aria-label="Đến năm" inputMode="numeric" maxLength="4" name="endYear" onChange={updateForm} required type="text" value={form.endYear} />
                </>
              )}
              {mode === 'range' && (
                <>
                  <DateInput name="startDate" onChange={updateForm} required value={form.startDate} />
                  <DateInput name="endDate" onChange={updateForm} required value={form.endDate} />
                </>
              )}
            </div>
            <button className="revenue-icon-action" disabled={loading} title="Xem báo cáo" type="submit">
              <BarChart3 aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="revenue-export-group">
          <button disabled={loading || !report} onClick={() => exportRevenueCsv(report)} type="button">
            <FileSpreadsheet aria-hidden="true" />
            <span>Xuất Excel</span>
          </button>
          <button disabled={loading || !report} onClick={() => exportRevenueCsv(report)} type="button">
            <Download aria-hidden="true" />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      <AdminAlert error={error} message="" />

      <section className="revenue-kpi-grid revenue-kpi-grid-four">
        {kpis.map((card) => {
          const CardIcon = card.icon

          return (
            <article className={`revenue-kpi-card ${card.accent}`} key={card.label}>
              <div className="revenue-kpi-top">
                <span>{card.label}</span>
                <span className="revenue-icon-box"><CardIcon aria-hidden="true" /></span>
              </div>
              <strong>{loading ? '...' : card.value}</strong>
              <div className="revenue-kpi-foot">
                <small>{card.detail}</small>
              </div>
            </article>
          )
        })}
      </section>

      <section className="revenue-split-grid">
        <article className="revenue-chart-card">
          <header>
            <div>
              <strong className="revenue-chart-title"><span className="revenue-icon-box"><BarChart3 aria-hidden="true" /></span>{revenueChartTitle}</strong>
              <h3>Hiệu suất theo kỳ</h3>
              <p>{report?.label || 'Dữ liệu doanh thu theo kỳ đã chọn'}</p>
            </div>
            <div className="revenue-chart-legend">
              <span><i className="revenue" />Doanh thu</span>
            </div>
          </header>
          <div className="revenue-compare-chart">
            <div className="revenue-chart-y-axis">
              {axisTicks.map((value) => <span key={value}>{formatAxisMoney(value)}</span>)}
            </div>
            {!report ? (
              <div className="admin-empty-state">
                <BarChart3 aria-hidden="true" />
                <strong>Chưa có doanh thu</strong>
                <span>Chỉ các hóa đơn đã thanh toán mới được tính vào báo cáo.</span>
              </div>
            ) : (
              <div className="revenue-compare-scroll">
                {displayBreakdown.map((item) => {
                  const revenue = Number(item.revenue || 0)
                  const canSelectDay = mode === 'daily'

                  return (
                    <button
                      className={`revenue-compare-group ${selectedPeakDate === item.period ? 'active' : ''}`}
                      disabled={!canSelectDay}
                      key={item.period}
                      onClick={() => canSelectDay && fetchPeakByDate(item.period)}
                      title={canSelectDay ? `Xem giờ cao điểm ngày ${getPeriodLabel(mode, item.period)}` : undefined}
                      type="button"
                    >
                      <div className="revenue-compare-bars">
                        <i className="revenue" style={{ height: `${Math.max(8, (revenue / maxChartValue) * 100)}%` }} />
                      </div>
                      <span>{getPeriodLabel(mode, item.period)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </article>

        <article className="revenue-peak-card" ref={peakCardRef}>
          <header>
            <h3>Giờ cao điểm trong ngày</h3>
            <h3 className="revenue-extra-title"><span className="revenue-icon-box"><Clock3 aria-hidden="true" /></span>Giờ cao điểm trong ngày</h3>
            <p>{peakSubtitle}</p>
          </header>
          <div className="revenue-hour-bar-chart">
            <div className="revenue-hour-bar-y">
              <span>{Math.max(...hourlyRows.map((item) => item.invoiceCount), 1)} đơn</span>
              <span>{Math.ceil(Math.max(...hourlyRows.map((item) => item.invoiceCount), 1) / 2)} đơn</span>
              <span>0 đơn</span>
            </div>
            <div className="revenue-hour-bars">
              {hourlyRows.map((item) => (
                <div className="revenue-hour-bar-item" key={item.hour}>
                  <div className="revenue-hour-bar-shell" title={`${item.rangeLabel}: ${item.invoiceCount} hóa đơn`}>
                    <i className={item.level} style={{ height: `${item.percent}%` }} />
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="revenue-hour-legend">
            <span><i className="high" /> Cao điểm</span>
            <span><i className="normal" /> Bình thường</span>
            <span><i className="low" /> Thấp điểm</span>
          </div>
          <div className="revenue-peak-line">
            <div className="revenue-peak-y">
              <span>{peakLineChart.maxInvoices}</span>
              <span>{Math.ceil(peakLineChart.maxInvoices / 2)}</span>
              <span>0</span>
            </div>
            <div className="revenue-peak-plot">
              <svg viewBox={`0 0 ${peakLineChart.width} ${peakLineChart.height}`} preserveAspectRatio="none" aria-hidden="true">
                <path className="area" d={peakLineChart.areaPath} />
                {peakLineChart.segments.map((segment) => (
                  <path className={`line ${segment.direction}`} d={segment.path} key={segment.id} />
                ))}
                {peakLineChart.points.map((point) => (
                  <circle key={point.rangeLabel} cx={point.x} cy={point.y} r="5" />
                ))}
              </svg>
              <div className="revenue-peak-points">
                {peakLineChart.points.map((point) => (
                  <div key={point.rangeLabel}>
                    <strong>{point.label}</strong>
                    <span>{point.invoiceCount} hóa đơn</span>
                    <small>{formatVND(point.revenue)}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="revenue-peak-list">
            {hourGroupRows.map((group) => (
              <div className="revenue-peak-row" key={group.label}>
                <div>
                  <span>{group.label}</span>
                  <strong className={group.level === 'Cao nhất' || group.level === 'Cao' ? 'hot' : ''}>{group.level}</strong>
                </div>
                <div className="revenue-peak-track">
                  <i style={{ width: `${group.percent}%` }} />
                </div>
                <small>{group.invoiceCount} hóa đơn - {formatVND(group.revenue)}</small>
              </div>
            ))}
          </div>
          <div className="revenue-insight" hidden>
            <div>
              <strong>Phân tích thông minh</strong>
              <p>
                {peakHour
                  ? `Khung giờ nổi bật là ${String(peakHour.hour).padStart(2, '0')}:00 với ${peakHour.invoiceCount} hóa đơn. Nên chuẩn bị nhân sự và nguyên liệu trước thời điểm này.`
                  : 'Chưa đủ dữ liệu để xác định khung giờ cao điểm.'}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="revenue-data-card">
        <header>
          <h3 className="revenue-extra-title"><span className="revenue-icon-box"><Trophy aria-hidden="true" /></span>Món bán chạy hàng đầu</h3>
          <h3>Món bán chạy hàng đầu</h3>
          <span>Top {report?.topProducts?.length || 0} sản phẩm</span>
        </header>

        <div className="admin-table-wrap">
          <table className="revenue-product-table revenue-top-table">
            <thead>
              <tr>
                <th>Thứ hạng</th>
                <th>Món</th>
                <th>Số lượng bán</th>
                <th>Doanh thu món</th>
              </tr>
            </thead>
            <tbody>
              {(report?.topProducts || []).length === 0 ? (
                <tr><td colSpan="4"><div className="admin-empty-state">Chưa có dữ liệu sản phẩm</div></td></tr>
              ) : (
                report.topProducts.slice(0, 5).map((product, index) => (
                  <tr key={`${product.productId}-${product.productName}`}>
                    <td><strong>#{index + 1}</strong></td>
                    <td>
                      <div className="revenue-product-cell">
                        {product.image ? (
                          <img alt={product.productName} src={getProductImageUrl(product.image)} />
                        ) : (
                          <span>{String(product.productName || '?').charAt(0).toUpperCase()}</span>
                        )}
                        <div>
                          <strong>{product.productName}</strong>
                          <small>{product.categoryName || 'Menu'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{Number(product.quantity || 0).toLocaleString('vi-VN')} ly</td>
                    <td>{formatVND(product.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default Report
