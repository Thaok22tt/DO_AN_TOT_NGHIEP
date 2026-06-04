import { ReceiptText } from 'lucide-react'
import PropTypes from 'prop-types'
import DateInput from '../../components/common/DateInput'
import Pagination from '../../components/common/Pagination'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { invoiceShape } from '../../utils/adminPropTypes'
import { renderMaterialIcon } from '../../utils/adminUtils'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

const invoiceStatusLabels = {
  Cancelled: 'Đã hủy',
  Completed: 'Hoàn thành',
  Paid: 'Đã thanh toán',
  Unpaid: 'Chưa thanh toán',
}

const invoiceStatusClasses = {
  Cancelled: 'locked',
  Completed: 'available',
  Paid: 'available',
  Unpaid: 'preparing',
}



function InvoicesSection({
  dateRange,
  invoices,
  loading,
  onDateRangeChange,
  onPageChange,
  onSearchChange,
  onStatusFilterChange,
  onViewDetail,
  page,
  searchTerm,
  statusFilter,
  totalPages,
}) {
  return (
    <>
      <section className="admin-toolbar" aria-label="Tìm kiếm và lọc hóa đơn">
        <label className="admin-search">
          {renderMaterialIcon('search')}
          <input
            maxLength="100"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm mã hóa đơn, khách hàng, bàn..."
            type="search"
            value={searchTerm}
          />
        </label>

        <div className="admin-toolbar-controls">
          <label className="admin-select-wrap">
            {renderMaterialIcon('filter_list')}
            <select onChange={(event) => onStatusFilterChange(event.target.value)} value={statusFilter}>
              <option value="all">Tất cả trạng thái</option>
              <option value="Unpaid">Chưa thanh toán</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Completed">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </label>
          <label className="admin-date-filter">
            <span>Từ</span>
            <DateInput name="startDate" onChange={onDateRangeChange} value={dateRange.startDate} />
          </label>
          <label className="admin-date-filter">
            <span>Đến</span>
            <DateInput name="endDate" onChange={onDateRangeChange} value={dateRange.endDate} />
          </label>
        </div>
      </section>

      <section className="admin-accounts-panel">
        <div className="admin-accounts-title">
          <div>
            <h2>Danh sách hóa đơn</h2>
            <span>
              Đang hiển thị {invoices.visible.length} trên {invoices.filtered.length} kết quả
            </span>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-invoices-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã hóa đơn</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <div className="admin-empty-state">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : invoices.visible.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="admin-empty-state">
                      <ReceiptText aria-hidden="true" />
                      <strong>Chưa có hóa đơn nào</strong>
                      <span>Hóa đơn bán hàng sẽ hiển thị tại đây</span>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.visible.map((invoice, index) => (
                  <tr
                    className="admin-clickable-row"
                    key={invoice.id}
                    onClick={() => onViewDetail(invoice)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onViewDetail(invoice)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d'}}>HD{String(invoice.id).padStart(3,'0')}</span></td>
                    <td>
                      <strong>{invoice.code}</strong>
                    </td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td>
                      <span className={`admin-status-chip ${invoiceStatusClasses[invoice.status] || 'locked'}`}>
                        {invoiceStatusLabels[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td>{formatDate(invoice.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          aria-label="Xem chi tiết hóa đơn"
                          onClick={(event) => {
                            event.stopPropagation()
                            onViewDetail(invoice)
                          }}
                          type="button"
                        >
                          {renderMaterialIcon('visibility')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          itemLabel="hóa đơn"
          onPageChange={onPageChange}
          totalItems={invoices.filtered.length}
          totalPages={totalPages}
          visibleCount={invoices.visible.length}
        />
      </section>
    </>
  )
}

InvoicesSection.propTypes = {
  dateRange: PropTypes.shape({
    endDate: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
  }).isRequired,
  invoices: PropTypes.shape({
    filtered: PropTypes.arrayOf(invoiceShape).isRequired,
    visible: PropTypes.arrayOf(invoiceShape).isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  onDateRangeChange: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
  onViewDetail: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  searchTerm: PropTypes.string.isRequired,
  statusFilter: PropTypes.string.isRequired,
  totalPages: PropTypes.number.isRequired,
}

export default InvoicesSection
