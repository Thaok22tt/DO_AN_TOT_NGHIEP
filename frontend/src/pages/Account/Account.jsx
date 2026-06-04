import { Users } from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { getAttendance } from '../../services/employeeService'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { accountShape, roleShape } from '../../utils/adminPropTypes'
import { getAccountInitial, renderMaterialIcon } from '../../utils/adminUtils'
import { formatDate } from '../../utils/formatDate'

const getRoleTone = (role = '') => {
  const normalizedRole = String(role).toLowerCase()

  if (normalizedRole === 'admin') return 'admin'
  if (normalizedRole.includes('pha')) return 'barista'
  return ''
}

const formatDateTime = (value) => {
  if (!value) return 'Chưa có'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

const formatLogoutTime = (value) => {
  if (!value) return 'Chưa đăng xuất'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatWorkDuration = (hours) => `${Number(hours || 0).toFixed(2)} giờ`

function LoginHistoryModal({ account, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    const loadHistory = async () => {
      setLoading(true)
      setError('')

      try {
        const result = await getAttendance()
        const accountHistory = (result.attendance || [])
          .filter((item) => Number(item.accountId) === Number(account.id))
          .sort((first, second) => new Date(second.loginAt || 0) - new Date(first.loginAt || 0))

        if (!ignore) setHistory(accountHistory)
      } catch (loadError) {
        if (!ignore) setError(loadError.message || 'Không thể tải lịch sử đăng nhập')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadHistory()

    return () => {
      ignore = true
    }
  }, [account.id])

  const completedCount = history.filter((item) => item.logoutAt).length
  const openCount = history.length - completedCount

  return (
    <div className="account-history-backdrop" role="presentation">
      <section className="account-history-modal" role="dialog" aria-modal="true" aria-label="Lịch sử đăng nhập">
        <aside className="account-history-profile">
          <span className="account-history-avatar">{getAccountInitial(account)}</span>
          <h2>{account.fullName || account.username}</h2>
          <p>{account.role || 'Nhân viên'}</p>
          <div className="account-history-info">
            <article>
              {renderMaterialIcon('verified_user')}
              <div>
                <span>ID tài khoản</span>
                <strong>MO-ACC-{String(account.id || 0).padStart(3, '0')}</strong>
              </div>
            </article>
            <article>
              {renderMaterialIcon('schedule')}
              <div>
                <span>Lần gần nhất</span>
                <strong>{formatDateTime(history[0]?.loginAt)}</strong>
              </div>
            </article>
          </div>
        </aside>

        <main className="account-history-content">
          <header>
            <div>
              <h1>Lịch sử đăng nhập</h1>
              <p>Theo dõi hoạt động bảo mật tài khoản</p>
            </div>
            <button aria-label="Đóng" onClick={onClose} type="button">
              {renderMaterialIcon('close')}
            </button>
          </header>

          <div className="account-history-body">
            <section className="account-history-stats">
              <article>
                <span>Lần đăng nhập</span>
                <strong>{history.length}</strong>
              </article>
              <article>
                <span>Đã đăng xuất</span>
                <strong>{completedCount}</strong>
              </article>
              <article>
                <span>Đang trong ca</span>
                <strong className={openCount > 0 ? 'danger' : ''}>{openCount}</strong>
              </article>
              <article>
                <span>Lần cuối</span>
                <strong>{formatDateTime(history[0]?.loginAt)}</strong>
              </article>
            </section>

            {error && <div className="admin-alert admin-alert-error">{error}</div>}

            <div className="admin-table-wrap">
              <table className="account-history-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Vai trò</th>
                    <th>Thời gian làm việc</th>
                    <th>Giờ đăng xuất</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5">Đang tải lịch sử đăng nhập...</td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan="5">Chưa có lịch sử đăng nhập</td>
                    </tr>
                  ) : (
                    history.map((item) => {
                      const completed = Boolean(item.logoutAt)

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{formatDateTime(item.loginAt)}</strong>
                            <span>{item.workDate ? formatDate(item.workDate) : ''}</span>
                          </td>
                          <td>{account.role || item.position || 'Nhân viên'}</td>
                          <td>{formatWorkDuration(item.totalHours)}</td>
                          <td>{formatLogoutTime(item.logoutAt)}</td>
                          <td>
                            <span className={`account-history-status ${completed ? 'success' : 'failed'}`}>
                              {completed ? 'Đã đăng xuất' : 'Đang trong ca'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </section>
    </div>
  )
}

function AccountsSection({
  accounts,
  loading,
  onCreate,
  onDelete,
  onEdit,
  onPageChange,
  onRoleFilterChange,
  onSearchChange,
  onSortChange,
  onToggleStatus,
  page,
  roleFilter,
  roles,
  searchTerm,
  sortMode,
  totalPages,
}) {
  const [historyAccount, setHistoryAccount] = useState(null)
  const activeAccounts = accounts.filtered.filter((account) => Number(account.status) === 1).length
  const lockedAccounts = accounts.filtered.length - activeAccounts
  const adminAccounts = accounts.filtered.filter((account) => String(account.role || '').toLowerCase() === 'admin').length

  return (
    <section className="account-management">
      <section className="account-stat-grid">
        <article className="account-stat-card">
          <div>{renderMaterialIcon('group')}</div>
          <span>Tổng tài khoản</span>
          <strong>{accounts.filtered.length}</strong>
        </article>
        <article className="account-stat-card">
          <div>{renderMaterialIcon('admin_panel_settings')}</div>
          <span>Quản trị viên</span>
          <strong>{adminAccounts}</strong>
        </article>
        <article className="account-stat-card">
          <div>{renderMaterialIcon('person_check')}</div>
          <span>Đang hoạt động</span>
          <strong>{activeAccounts}</strong>
        </article>
        <article className="account-stat-card">
          <div className="danger">{renderMaterialIcon('person_off')}</div>
          <span>Bị khóa</span>
          <strong>{lockedAccounts}</strong>
        </article>
      </section>

      <section className="account-toolbar" aria-label="Tìm kiếm và lọc tài khoản">
        <label className="account-search">
          {renderMaterialIcon('search')}
          <input onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm kiếm..." type="search" value={searchTerm} />
        </label>

        <label className="account-filter">
          {renderMaterialIcon('filter_list')}
          <select onChange={(event) => onRoleFilterChange(event.target.value)} value={roleFilter}>
            <option value="all">Lọc vai trò</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <label className="account-filter">
          {renderMaterialIcon('sort')}
          <select onChange={(event) => onSortChange(event.target.value)} value={sortMode}>
            <option value="newest">Sắp xếp</option>
            <option value="name">Theo tên</option>
            <option value="role">Theo vai trò</option>
            <option value="status">Theo trạng thái</option>
          </select>
        </label>
      </section>

      <section className="account-table-panel">
        <div className="account-table-title">
          <div>
            <h2>Danh sách tài khoản</h2>
            <span>Đang hiển thị {accounts.visible.length} trên {accounts.filtered.length} kết quả</span>
          </div>
          <button className="admin-primary-action" onClick={onCreate} type="button">
            {renderMaterialIcon('person_add')}
            <span>Thêm tài khoản</span>
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên đăng nhập</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="admin-empty-state">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : accounts.visible.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="admin-empty-state">
                      <Users aria-hidden="true" />
                      <strong>Chưa có tài khoản nào</strong>
                      <span>Bắt đầu bằng cách thêm tài khoản mới vào hệ thống</span>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.visible.map((account, index) => {
                  const active = Number(account.status) === 1

                  return (
                    <tr key={account.id}>
                      <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d'}}>TK{String(account.id).padStart(3,'0')}</span></td>
                      <td>
                        <div className="account-user-cell">
                          <span>{getAccountInitial(account)}</span>
                          <strong>{account.username}</strong>
                        </div>
                      </td>
                      <td>{account.fullName || 'Chưa cập nhật'}</td>
                      <td>{account.email || 'Chưa cập nhật'}</td>
                      <td>{account.phoneNumber || 'Chưa cập nhật'}</td>
                      <td>
                        <span className={`account-role-chip ${getRoleTone(account.role)}`}>
                          {account.role}
                        </span>
                      </td>
                      <td>
                        <span className={`account-status-text ${active ? 'active' : 'locked'}`}>
                          {active ? '● Hoạt động' : '● Khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="account-row-actions">
                          <button aria-label="Sửa tài khoản" onClick={() => onEdit(account)} title="Chỉnh sửa" type="button">
                            {renderMaterialIcon('edit')}
                          </button>
                          <button aria-label={active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} onClick={() => onToggleStatus(account)} title={active ? 'Khóa' : 'Mở khóa'} type="button">
                            {renderMaterialIcon(active ? 'lock' : 'lock_open')}
                          </button>
                          <button aria-label="Xóa tài khoản" className="danger" onClick={() => onDelete(account)} title="Xóa" type="button">
                            {renderMaterialIcon('delete')}
                          </button>
                          <button aria-label="Xem lịch sử đăng nhập" onClick={() => setHistoryAccount(account)} title="Xem lịch sử" type="button">
                            {renderMaterialIcon('history')}
                          </button>
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
          itemLabel="tài khoản"
          onPageChange={onPageChange}
          totalItems={accounts.filtered.length}
          totalPages={totalPages}
          visibleCount={accounts.visible.length}
        />
      </section>

      {historyAccount && <LoginHistoryModal account={historyAccount} onClose={() => setHistoryAccount(null)} />}
    </section>
  )
}

LoginHistoryModal.propTypes = {
  account: accountShape.isRequired,
  onClose: PropTypes.func.isRequired,
}

AccountsSection.propTypes = {
  accounts: PropTypes.shape({
    filtered: PropTypes.arrayOf(accountShape).isRequired,
    visible: PropTypes.arrayOf(accountShape).isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRoleFilterChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  roleFilter: PropTypes.string.isRequired,
  roles: PropTypes.arrayOf(roleShape).isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
  totalPages: PropTypes.number.isRequired,
}

export default AccountsSection
