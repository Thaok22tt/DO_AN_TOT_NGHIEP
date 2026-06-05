import { Badge } from 'lucide-react'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { useConfirm } from '../../components/common/useConfirm'
import {
  createShiftTemplate,
  getAttendance,
  getPayroll,
  getShiftAssignments,
  getShiftTemplates,
  updatePayrollPayment,
} from '../../services/employeeService'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { employeeShape } from '../../utils/adminPropTypes'
import { getEmployeeInitial, renderMaterialIcon } from '../../utils/adminUtils'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)
const getToday = () => new Date().toISOString().slice(0, 10)
const normalizeRoleText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const isAdminAttendanceRow = (row) => {
  const values = [row.role, row.position, row.employeeName].map(normalizeRoleText)

  return values.some((value) => ['admin', 'administrator', 'quan tri vien'].includes(value))
}
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const timeSlots = ['08:00', '10:00', '12:00', '14:00']

const getWeekStart = (date = new Date()) => {
  const current = new Date(date)
  const day = current.getDay() || 7
  current.setDate(current.getDate() - day + 1)
  current.setHours(0, 0, 0, 0)

  return current
}

const formatInputDate = (date) => date.toISOString().slice(0, 10)

const getWeekDays = (weekStart) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    return {
      date,
      input: formatInputDate(date),
      label: dayLabels[index],
    }
  })

const formatEmployeeCode = (employee, index, page) => {
  const number = employee.id || (page - 1) * PAGE_SIZE + index + 1

  return `MC${String(number).padStart(3, '0')}`
}

const formatPhone = (phoneNumber) => {
  const digits = String(phoneNumber || '').replace(/\D/g, '')

  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }

  return phoneNumber || 'Chưa cập nhật'
}

const formatHours = (hours) => `${Number(hours || 0).toFixed(2)}h`

function EmployeeTabs({ activeTab, onTabChange }) {
  return (
    <div className="employee-tabs" aria-label="Quản lý nhân sự">
      <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => onTabChange('employees')} type="button">
        Nhân viên
      </button>
      <button className={activeTab === 'payroll' ? 'active' : ''} onClick={() => onTabChange('payroll')} type="button">
        Chấm công & Lương
      </button>
    </div>
  )
}

function PayrollFilterStats({ selectedItem }) {
  const [totals, setTotals] = useState({ count: 0, hours: 0 })

  useEffect(() => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    getPayroll(month).then((data) => {
      const list = data?.payroll || data || []
      setTotals({
        count: list.length,
        hours: list.reduce((s, i) => s + Number(i.totalHours || 0), 0),
      })
    }).catch(() => {})
  }, [])

  const isPaid = selectedItem?.paymentStatus === 'Paid'
  const salary = Number(selectedItem?.salary || 0)
  const name = selectedItem?.employeeName || null

  return (
    <div className="payroll-filter-stats">
      <article className="payroll-stat-card">
        <div className="payroll-stat-icon">{renderMaterialIcon('group')}</div>
        <div><strong>{totals.count}</strong><span>Nhân viên kỳ này</span></div>
      </article>
      <article className="payroll-stat-card">
        <div className="payroll-stat-icon">{renderMaterialIcon('schedule')}</div>
        <div>
          <strong>{selectedItem ? formatHours(Number(selectedItem.totalHours || 0)) : formatHours(totals.hours)}</strong>
          <span>{name ? `Giờ làm - ${name}` : 'Tổng giờ làm'}</span>
        </div>
      </article>
      <article className={`payroll-stat-card ${selectedItem ? (isPaid ? 'payroll-stat-success' : '') : ''}`}>
        <div className="payroll-stat-icon">{renderMaterialIcon('check_circle')}</div>
        <div>
          <strong>{selectedItem ? (isPaid ? formatCurrency(salary) : '0 đ') : '—'}</strong>
          <span>{name ? `Đã trả - ${name}` : 'Đã thanh toán'}</span>
        </div>
      </article>
      <article className={`payroll-stat-card ${selectedItem ? (!isPaid ? 'payroll-stat-danger' : '') : 'payroll-stat-danger'}`}>
        <div className="payroll-stat-icon">{renderMaterialIcon('pending_actions')}</div>
        <div>
          <strong>{selectedItem ? (!isPaid ? formatCurrency(salary) : '0 đ') : 'Chọn nhân viên'}</strong>
          <span>{name ? `Chờ trả - ${name}` : 'Chờ thanh toán'}</span>
        </div>
      </article>
    </div>
  )
}

function EmployeeFilterBar({
  activeTab,
  onSearchChange,
  onSortChange,
  onTabChange,
  searchTerm,
  sortMode,
}) {
  return (
    <section className="employee-filter-bar" aria-label="Tìm kiếm và lọc nhân viên">
      <EmployeeTabs activeTab={activeTab} onTabChange={onTabChange} />
      {activeTab === 'employees' && (
        <div className="employee-filter-right">
          <label className="employee-search">
            {renderMaterialIcon('search')}
            <input
              maxLength="100"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm tên, mã nhân viên..."
              type="search"
              value={searchTerm}
            />
          </label>
          <label className="employee-sort">
            {renderMaterialIcon('filter_list')}
            <select onChange={(event) => onSortChange(event.target.value)} value={sortMode}>
              <option value="newest">Vai trò</option>
              <option value="name">Theo tên</option>
              <option value="status">Theo trạng thái</option>
            </select>
          </label>
        </div>
      )}
    </section>
  )
}

function useLiveHours(loginAt, logoutAt, storedHours) {
  const [hours, setHours] = useState(storedHours || 0)
  useEffect(() => {
    if (!loginAt || logoutAt) {
      setHours(storedHours || 0)
      return
    }
    const calc = () => {
      const diff = (Date.now() - new Date(loginAt).getTime()) / 3600000
      setHours(Math.max(0, diff))
    }
    calc()
    const t = setInterval(calc, 60000)
    return () => clearInterval(t)
  }, [loginAt, logoutAt, storedHours])
  return hours
}

function AttendanceRow({ row }) {
  const hours = useLiveHours(row.loginAt, row.logoutAt, row.totalHours)
  return (
    <article className="attendance-row" key={row.id}>
      <div>
        <span className="attendance-avatar">{String(row.employeeName || '?').charAt(0).toUpperCase()}</span>
        <div>
          <strong>{row.employeeName || 'Nhân viên'}</strong>
          <small>{row.loginAt ? `Vào ca: ${new Date(row.loginAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Chưa vào ca'}</small>
        </div>
      </div>
      <div>
        <b>{formatHours(hours)}</b>
        {!row.logoutAt && row.loginAt && <small style={{color:'#2e7d32',fontSize:'0.72rem',marginLeft:4}}>●</small>}
      </div>
    </article>
  )
}

function PayrollView() {
  const confirm = useConfirm()
  const [attendance, setAttendance] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth)
  const [payroll, setPayroll] = useState([])
  const [savingId, setSavingId] = useState(null)
  const [selectedPayrollItem, setSelectedPayrollItem] = useState(null)

  const today = getToday()

  const loadPayrollData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [attendanceResult, payrollResult] = await Promise.all([
        getAttendance({ startDate: today, endDate: today }),
        getPayroll(month),
      ])

      setAttendance((attendanceResult.attendance || []).filter((row) => !isAdminAttendanceRow(row)))
      setPayroll(payrollResult.payroll || [])
    } catch (loadError) {
      setError(loadError.message || 'Không thể tải dữ liệu chấm công và lương')
    } finally {
      setLoading(false)
    }
  }, [month, today])

  useEffect(() => {
    loadPayrollData()
  }, [loadPayrollData])

  useEffect(() => {
    if (payroll.length === 0) {
      setSelectedPayrollItem(null)
      return
    }

    setSelectedPayrollItem((current) => {
      const currentKey = current?.employeeId || current?.accountId
      const nextSelected = payroll.find((item) => (item.employeeId || item.accountId) === currentKey)

      return nextSelected || payroll[0]
    })
  }, [payroll])

  const selectedPayrollSummary = selectedPayrollItem || payroll[0] || null
  const selectedSalary = Number(selectedPayrollSummary?.salary || 0)
  const selectedPendingSalary = selectedPayrollSummary && selectedPayrollSummary.paymentStatus !== 'Paid' ? selectedSalary : 0

  const handleTogglePayment = async (item) => {
    const nextStatus = item.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'
    const confirmed = await confirm({
      body: `${nextStatus === 'Paid' ? 'Xác nhận đã thanh toán lương' : 'Chuyển lương về trạng thái chưa thanh toán'} cho "${item.employeeName}"?`,
      confirmLabel: 'Xác nhận',
    })
    if (!confirmed) return

    setSavingId(item.employeeId)

    try {
      await updatePayrollPayment(item.employeeId, { month, status: nextStatus })
      await loadPayrollData()
    } catch (saveError) {
      setError(saveError.message || 'Không thể cập nhật trạng thái thanh toán')
    } finally {
      setSavingId(null)
    }
  }

  const openPayrollDetail = (item) => {
    setSelectedPayrollItem(item)
  }

  const totalHours = payroll.reduce((s, i) => s + Number(i.totalHours || 0), 0)
  const paidCount = payroll.filter(i => i.paymentStatus === 'Paid').length

  return (
    <section className="employee-payroll">
      <PayrollFilterStats selectedItem={selectedPayrollItem} />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="payroll-layout">
        <aside className="payroll-side">
          <section className="payroll-card">
            <div className="payroll-card-head">
              <h3>Chấm công hôm nay</h3>
              <span>{formatDate(today)}</span>
            </div>
            <div className="attendance-list">
              {loading ? (
                <div className="attendance-empty">Đang tải dữ liệu...</div>
              ) : attendance.length === 0 ? (
                <div className="attendance-empty">Chưa có dữ liệu chấm công hôm nay</div>
              ) : (
                attendance.slice(0, 5).map((row) => (
                  <AttendanceRow key={row.id} row={row} />
                ))
              )}
            </div>
          </section>

        </aside>

        <main className="payroll-main">
          <section className="payroll-card payroll-table-card">
            <div className="payroll-card-head">
              <h3>Chi tiết bảng lương</h3>
              <label className="payroll-month">
                <input onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
              </label>
            </div>
            <div className="admin-table-wrap">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Giờ làm</th>
                    <th>Lương cơ bản</th>
                    <th>Tổng lương</th>
                    <th>Trạng thái</th>
                    <th>Thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6">Đang tải bảng lương...</td>
                    </tr>
                  ) : payroll.length === 0 ? (
                    <tr>
                      <td colSpan="6">Chưa có dữ liệu bảng lương</td>
                    </tr>
                  ) : (
                    payroll.map((item) => {
                      const paid = item.paymentStatus === 'Paid'
                      const hasEmployeeProfile = Boolean(item.employeeId)

                      return (
                        <tr
                          key={item.employeeId || `account-${item.accountId}`}
                          className={`payroll-row ${selectedPayrollSummary && (selectedPayrollSummary.employeeId || selectedPayrollSummary.accountId) === (item.employeeId || item.accountId) ? 'active' : ''}`}
                          onClick={() => openPayrollDetail(item)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openPayrollDetail(item)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <td>
                            <div className="payroll-employee">
                              <span>{String(item.employeeName || '?').charAt(0).toUpperCase()}</span>
                              <div>
                                <strong>{item.employeeName}</strong>
                                <small>{hasEmployeeProfile ? item.position || 'Nhân viên' : `${item.position || 'Tài khoản'} - chưa có hồ sơ nhân viên`}</small>
                              </div>
                            </div>
                          </td>
                          <td>{formatHours(item.totalHours)}</td>
                          <td>{formatCurrency(item.hourlyRate)}/h</td>
                          <td>{formatCurrency(item.salary)}</td>
                          <td>
                            <span className={`payroll-status ${paid ? 'paid' : 'pending'}`}>
                              <i />
                              {paid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                            </span>
                          </td>
                          <td>
                            <button
                              aria-label="Cập nhật thanh toán"
                              className={`payroll-toggle ${paid ? 'checked' : ''}`}
                              disabled={!hasEmployeeProfile || savingId === item.employeeId}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleTogglePayment(item)
                              }}
                              type="button"
                            >
                              <span />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="payroll-summary-grid">
            <article className="payroll-summary-card">
              {renderMaterialIcon('account_balance_wallet')}
              <div>
                <span>Tổng quỹ lương</span>
                <strong>{formatCurrency(selectedSalary)}</strong>
              </div>
            </article>
            <article className="payroll-summary-card danger">
              {renderMaterialIcon('pending_actions')}
              <div>
                <span>Chưa thanh toán</span>
                <strong>{formatCurrency(selectedPendingSalary)}</strong>
              </div>
            </article>
          </section>
        </main>
      </div>
    </section>
  )
}

function ShiftScheduleView({ employees }) {
  const confirm = useConfirm()
  const [assignments, setAssignments] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ endTime: '', name: '', startTime: '' })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState([])
  const [viewMode, setViewMode] = useState('week')
  const [weekStart] = useState(() => getWeekStart())
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const today = getToday()

  const loadShiftData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [templateResult, assignmentResult] = await Promise.all([
        getShiftTemplates(),
        getShiftAssignments({
          endDate: weekDays[6].input,
          startDate: weekDays[0].input,
        }),
      ])

      setTemplates(templateResult.shiftTemplates || [])
      setAssignments(assignmentResult.assignments || [])
    } catch (loadError) {
      setError(loadError.message || 'Không thể tải lịch làm việc')
    } finally {
      setLoading(false)
    }
  }, [weekDays])

  useEffect(() => {
    loadShiftData()
  }, [loadShiftData])

  const assignmentsByDate = useMemo(
    () =>
      assignments.reduce((map, assignment) => {
        const rows = map.get(assignment.workDate) || []
        rows.push(assignment)
        map.set(assignment.workDate, rows)
        return map
      }, new Map()),
    [assignments],
  )

  const handleCreateTemplate = async (event) => {
    event.preventDefault()
    const confirmed = await confirm({
      body: `Tạo ca làm việc "${form.name}"?`,
      confirmLabel: 'Tiếp tục',
    })
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await createShiftTemplate({
        endTime: form.endTime,
        name: form.name,
        startTime: form.startTime,
        status: 'Active',
      })
      setForm({ endTime: '', name: '', startTime: '' })
      setModalOpen(false)
      await loadShiftData()
    } catch (saveError) {
      setError(saveError.message || 'Không thể tạo ca làm việc')
    } finally {
      setSaving(false)
    }
  }

  const renderShiftCards = (dayInput, slotIndex) => {
    const dayAssignments = assignmentsByDate.get(dayInput) || []
    const visibleAssignments = dayAssignments.filter((assignment) => {
      const hour = Number(String(assignment.startTime || '08:00').slice(0, 2))
      const slotHour = Number(timeSlots[slotIndex].slice(0, 2))

      return hour >= slotHour && hour < slotHour + 2
    })

    if (visibleAssignments.length > 0) {
      return visibleAssignments.map((assignment, index) => (
        <article className={`shift-card shift-tone-${index % 3}`} key={assignment.id}>
          <div className="shift-card-head">
            <h4>{assignment.shiftName}</h4>
            {renderMaterialIcon('drag_indicator')}
          </div>
          <div className="shift-staff-list">
            <span className="shift-avatar">{String(assignment.employeeName || '?').charAt(0).toUpperCase()}</span>
            <strong>{assignment.employeeName}</strong>
          </div>
          <small>{assignment.startTime?.slice(0, 5)} - {assignment.endTime?.slice(0, 5)}</small>
          <button type="button">{renderMaterialIcon('person_add')} Assign</button>
        </article>
      ))
    }

    if (slotIndex === 0 && templates.length > 0 && dayInput === weekDays[0].input) {
      const template = templates[0]

      return (
        <article className="shift-card shift-tone-0">
          <div className="shift-card-head">
            <h4>{template.name}</h4>
            {renderMaterialIcon('drag_indicator')}
          </div>
          <div className="shift-avatar-stack">
            {employees.slice(0, 2).map((employee) => (
              <span className="shift-avatar" key={employee.id}>{getEmployeeInitial(employee)}</span>
            ))}
            {employees.length > 2 && <span className="shift-avatar">+{employees.length - 2}</span>}
          </div>
          <small>{template.startTime?.slice(0, 5)} - {template.endTime?.slice(0, 5)}</small>
          <button type="button">{renderMaterialIcon('person_add')} Assign</button>
        </article>
      )
    }

    return null
  }

  return (
    <section className="employee-shifts">
      <div className="shift-topbar">
        <div>
          <span>Lịch làm việc & Phân ca</span>
          <h2>Tuần {formatDate(weekDays[0].input)} - {formatDate(weekDays[6].input)}</h2>
        </div>
        <div className="shift-top-actions">
          <div className="shift-view-toggle">
            <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')} type="button">Week</button>
            <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')} type="button">Month</button>
          </div>
          <button className="shift-create-button" onClick={() => setModalOpen(true)} type="button">
            {renderMaterialIcon('add')}
            <span>Create Shift</span>
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <section className="shift-calendar-panel">
        <div className="shift-calendar-grid shift-calendar-head">
          <div />
          {weekDays.map((day) => (
            <div className="shift-day-head" key={day.input}>
              <span>{day.label}</span>
              <strong className={day.input === today ? 'today' : ''}>{day.date.getDate()}</strong>
            </div>
          ))}
        </div>

        <div className="shift-calendar-body">
          {timeSlots.map((slot, slotIndex) => (
            <div className="shift-calendar-grid shift-time-row" key={slot}>
              <div className="shift-time-label">{slot}</div>
              {weekDays.map((day) => (
                <div className="shift-day-cell" key={`${day.input}-${slot}`}>
                  {loading ? null : renderShiftCards(day.input, slotIndex)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {modalOpen && (
        <div className="shift-modal-backdrop" role="presentation">
          <form className="shift-modal" onSubmit={handleCreateTemplate}>
            <div className="shift-modal-head">
              <h3>Tạo ca làm việc</h3>
              <button onClick={() => setModalOpen(false)} type="button">{renderMaterialIcon('close')}</button>
            </div>
            <label>
              <span>Tên ca làm việc</span>
              <input
                maxLength="100"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ca Sáng, Rush Hour..."
                required
                type="text"
                value={form.name}
              />
            </label>
            <div className="shift-time-inputs">
              <label>
                <span>Giờ bắt đầu</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  required
                  type="time"
                  value={form.startTime}
                />
              </label>
              <label>
                <span>Giờ kết thúc</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  required
                  type="time"
                  value={form.endTime}
                />
              </label>
            </div>
            <div className="shift-weekday-pills">
              {dayLabels.map((day, index) => (
                <button className={index === 0 ? 'active' : ''} key={day} type="button">{day}</button>
              ))}
            </div>
            <div className="shift-modal-actions">
              <button onClick={() => setModalOpen(false)} type="button">Hủy bỏ</button>
              <button disabled={saving} type="submit">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

function useMonthlyStats() {
  const [monthlyHours, setMonthlyHours] = useState(0)
  const [monthlySalary, setMonthlySalary] = useState(0)

  const fetch = useCallback(() => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    getPayroll(month)
      .then((data) => {
        const list = data?.payroll || data || []
        setMonthlyHours(list.reduce((s, i) => s + Number(i.totalHours || 0), 0))
        setMonthlySalary(list.reduce((s, i) => s + Number(i.salary || 0), 0))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetch])

  return { monthlyHours, monthlySalary }
}

function EmployeesListView({
  activeTab,
  employees,
  loading,
  onCreate,
  onDelete,
  onEdit,
  onEmployeeTabChange,
  onPageChange,
  onSearchChange,
  onSortChange,
  onToggleStatus,
  page,
  searchTerm,
  sortMode,
  todayAttendance,
  totalPages,
}) {
  const activeEmployees = (todayAttendance || []).filter((row) => row.loginAt && !row.logoutAt).length
  const { monthlyHours, monthlySalary } = useMonthlyStats()
  const attendanceRate = employees.filtered.length ? Math.round((activeEmployees / employees.filtered.length) * 100) : 0

  return (
    <>
      <section className="employee-stat-grid">
        <article className="employee-stat-card">
          <span>Tổng nhân sự</span>
          <div>
            <strong>{employees.filtered.length}</strong>
            <em>+2 tháng này</em>
          </div>
        </article>
        <article className="employee-stat-card">
          <span>Đang làm việc</span>
          <div>
            <strong>{String(activeEmployees).padStart(2, '0')}</strong>
            <small>Đang trong ca</small>
          </div>
        </article>
        <article className="employee-stat-card">
          <span>Tổng giờ làm (Tháng)</span>
          <div>
            <strong>{monthlyHours.toLocaleString('vi-VN')}</strong>
            <small>Hrs</small>
          </div>
        </article>
        <article className="employee-stat-card">
          <span>Tổng lương (Tháng)</span>
          <div>
            <strong>{formatCurrency(monthlySalary)}</strong>
          </div>
        </article>
      </section>

      <EmployeeFilterBar
        activeTab={activeTab}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onTabChange={onEmployeeTabChange}
        searchTerm={searchTerm}
        sortMode={sortMode}
      />

      <section className="employee-table-panel">
        <div className="employee-table-title">
          <div>
            <h2>Danh sách nhân viên</h2>
            <span>Đang hiển thị {employees.visible.length} trên {employees.filtered.length} kết quả</span>
          </div>
          <button className="admin-primary-action employee-add-button" onClick={onCreate} type="button">
            {renderMaterialIcon('person_add')}
            <span>Thêm nhân viên</span>
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Tên Nhân viên</th>
                <th>Giới tính</th>
                <th>Ngày sinh</th>
                <th>SĐT</th>
                <th>Chức vụ</th>
                <th>Ca làm</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">
                    <div className="admin-empty-state">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : employees.visible.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="admin-empty-state">
                      <Badge aria-hidden="true" />
                      <strong>Chưa có nhân viên nào</strong>
                      <span>Bắt đầu bằng cách thêm hồ sơ nhân viên mới vào hệ thống</span>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.visible.map((employee, index) => {
                  const active = Number(employee.accountStatus) === 1

                  return (
                    <tr className={!active ? 'is-inactive' : ''} key={employee.id}>
                      <td>{formatEmployeeCode(employee, index, page)}</td>
                      <td>
                        <div className="employee-name-cell">
                          <span className="employee-avatar">{getEmployeeInitial(employee)}</span>
                          <div>
                            <strong>{employee.fullName}</strong>
                            <small>{employee.email || employee.username || 'Chưa có tài khoản'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{employee.gender || 'Chưa cập nhật'}</td>
                      <td>{employee.birthDate ? formatDate(employee.birthDate) : 'Chưa cập nhật'}</td>
                      <td>{formatPhone(employee.phoneNumber)}</td>
                      <td><span className="employee-role-chip">{employee.position || employee.role || 'Chưa cập nhật'}</span></td>
                      <td>{employee.workShift ? `Ca ${employee.workShift}` : 'Chưa cập nhật'}</td>
                      <td>
                        <span className={`employee-presence ${active ? 'active' : 'inactive'}`}>
                          <i />
                          {active ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="employee-row-actions">
                          <button aria-label="Sửa nhân viên" onClick={() => onEdit(employee)} type="button">{renderMaterialIcon('edit')}</button>
                          <button aria-label={active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} onClick={() => onToggleStatus(employee)} type="button">
                            {renderMaterialIcon(active ? 'lock' : 'lock_open')}
                          </button>
                          <button aria-label="Xóa nhân viên" className="danger" onClick={() => onDelete(employee)} type="button">{renderMaterialIcon('delete')}</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          itemLabel="nhân viên"
          onPageChange={onPageChange}
          totalItems={employees.filtered.length}
          totalPages={totalPages}
          visibleCount={employees.visible.length}
        />
      </section>

    </>
  )
}

function EmployeesSection(props) {
  const { activeTab, employees, onEmployeeTabChange, onSearchChange, onSortChange, searchTerm, sortMode } = props
  const visibleTab = activeTab === 'shifts' ? 'employees' : activeTab

  return (
    <section className="employee-management">
      {visibleTab !== 'employees' && (
        <EmployeeFilterBar
          activeTab={visibleTab}
          onSearchChange={onSearchChange}
          onSortChange={onSortChange}
          onTabChange={onEmployeeTabChange}
          searchTerm={searchTerm}
          sortMode={sortMode}
        />
      )}
      {visibleTab === 'payroll' ? (
        <PayrollView />
      ) : (
        <EmployeesListView {...props} activeTab={visibleTab} />
      )}
    </section>
  )
}

ShiftScheduleView.propTypes = {
  employees: PropTypes.arrayOf(employeeShape).isRequired,
}

EmployeeTabs.propTypes = {
  activeTab: PropTypes.oneOf(['employees', 'payroll']).isRequired,
  onTabChange: PropTypes.func.isRequired,
}

EmployeeFilterBar.propTypes = {
  activeTab: PropTypes.oneOf(['employees', 'payroll']).isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onTabChange: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
}

EmployeesListView.propTypes = {
  activeTab: PropTypes.oneOf(['employees', 'payroll']).isRequired,
  employees: PropTypes.shape({
    filtered: PropTypes.arrayOf(employeeShape).isRequired,
    visible: PropTypes.arrayOf(employeeShape).isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onEmployeeTabChange: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
  todayAttendance: PropTypes.arrayOf(PropTypes.object),
  totalPages: PropTypes.number.isRequired,
}

EmployeesSection.propTypes = {
  ...EmployeesListView.propTypes,
  activeTab: PropTypes.oneOf(['employees', 'shifts', 'payroll']).isRequired,
  onEmployeeTabChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
}

export default EmployeesSection
