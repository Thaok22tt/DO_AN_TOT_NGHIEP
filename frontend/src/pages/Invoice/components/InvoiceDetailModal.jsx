import { X } from 'lucide-react'
import PropTypes from 'prop-types'
import { formatCurrency } from '../../../utils/formatCurrency'

const invoiceStatusLabels = {
  Cancelled: 'Đã hủy',
  Completed: 'Hoàn thành',
  Paid: 'Đã thanh toán',
  Unpaid: 'Chưa thanh toán',
}

const paymentMethodLabels = {
  BankTransfer: 'Chuyển khoản',
  Cash: 'Tiền mặt',
  Card: 'Thẻ',
  EWallet: 'Ví điện tử',
  Momo: 'MoMo',
  Transfer: 'Chuyển khoản',
  VNPay: 'VNPay',
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


function InvoiceDetailModal({ invoice, loading, onClose }) {
  const details = invoice?.details || []
  const subtotal = details.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
  const totalAmount = Number(invoice?.totalAmount || 0)
  const discountAmount = Math.max(subtotal - totalAmount, 0)
  const isPaidOrCompleted = invoice?.status === 'Paid' || invoice?.status === 'Completed'
  const paidAt = invoice?.paidAt || (isPaidOrCompleted ? invoice?.updatedAt : '')
  const paymentMethod = isPaidOrCompleted
    ? paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod || 'Chưa có dữ liệu'
    : 'Chưa thanh toán'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-modal admin-invoice-modal" role="dialog" aria-modal="true">
        <div className="admin-modal-header">
          <div>
            <h2>Chi tiết hóa đơn</h2>
            {!loading && invoice && <span className="admin-modal-subtitle">{invoice.code}</span>}
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-invoice-detail">
          {loading || !invoice ? (
            <div className="admin-empty-state">Đang tải dữ liệu...</div>
          ) : (
            <>
              <div className="admin-invoice-summary">
                <div>
                  <span>Người tạo</span>
                  <strong>{invoice.cashierName || 'Chưa có dữ liệu'}</strong>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <strong>{invoiceStatusLabels[invoice.status] || invoice.status || 'Chưa có'}</strong>
                </div>
                <div>
                  <span>Phương thức thanh toán</span>
                  <strong>{paymentMethod}</strong>
                </div>
                <div>
                  <span>Giờ thanh toán</span>
                  <strong>{paidAt ? formatDateTime(paidAt) : 'Chưa thanh toán'}</strong>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table admin-invoice-detail-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Món đã order</th>
                      <th>Số lượng</th>
                      <th>Giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.length === 0 ? (
                      <tr>
                        <td colSpan="5">Chưa có món nào trong hóa đơn</td>
                      </tr>
                    ) : (
                      details.map((item, index) => (
                        <tr key={item.id || `${item.productName}-${index}`}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{item.productName || 'Món chưa đặt tên'}</strong>
                            {item.note && <small>{item.note}</small>}
                          </td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unitPrice)}</td>
                          <td>{formatCurrency(item.lineTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-invoice-total">
                <div>
                  <span>Tạm tính</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div>
                  <span>Khuyến mãi{invoice.promotionName ? ` (${invoice.promotionName})` : ''}</span>
                  <strong>-{formatCurrency(discountAmount)}</strong>
                </div>
                <div className="final">
                  <span>Tổng tiền</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

InvoiceDetailModal.propTypes = {
  invoice: PropTypes.shape({
    areaName: PropTypes.string,
    cashierName: PropTypes.string,
    code: PropTypes.string,
    createdAt: PropTypes.string,
    customerName: PropTypes.string,
    details: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        lineTotal: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        note: PropTypes.string,
        productName: PropTypes.string,
        quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        unitPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      })
    ),
    orderType: PropTypes.string,
    paidAt: PropTypes.string,
    paymentMethod: PropTypes.string,
    promotionName: PropTypes.string,
    status: PropTypes.string,
    tableName: PropTypes.string,
    totalAmount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    updatedAt: PropTypes.string,
  }),
  loading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default InvoiceDetailModal
