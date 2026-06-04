import { Percent } from 'lucide-react'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { invoiceShape, promotionShape } from '../../utils/adminPropTypes'
import { renderMaterialIcon } from '../../utils/adminUtils'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

const promotionStatusLabels = {
  Active: 'Đang bật',
  Inactive: 'Đã tắt',
}

const promotionStatusClasses = {
  Active: 'active',
  Inactive: 'inactive',
}

const formatDiscount = (promotion) => {
  if (promotion.discountType === 'Percent') {
    return `${Number(promotion.discountValue || 0).toLocaleString('vi-VN')}%`
  }

  return formatCurrency(promotion.discountValue)
}

const getPromotionTypeLabel = (promotion) => (promotion.discountType === 'Percent' ? 'Giảm % hóa đơn' : 'Giảm giá trực tiếp')

const getPromotionInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'KM'

const getInvoiceDiscountAmount = (invoice) => {
  const explicitDiscount = Number(invoice.discountAmount)
  if (Number.isFinite(explicitDiscount) && explicitDiscount > 0) return explicitDiscount

  const subtotal = Number(invoice.subtotal)
  const total = Number(invoice.totalAmount)
  if (Number.isFinite(subtotal) && Number.isFinite(total) && subtotal > total) return subtotal - total

  const discountValue = Number(invoice.promotionDiscountValue || 0)
  if (invoice.promotionDiscountType === 'Fixed') return discountValue
  if (invoice.promotionDiscountType === 'Percent' && Number.isFinite(total) && discountValue > 0 && discountValue < 100) {
    return Math.round((total * discountValue) / (100 - discountValue))
  }

  return 0
}

const getCampaignRating = ({ useCount, totalDiscount, totalRevenue }) => {
  if (useCount >= 10 || totalRevenue >= 5000000) return 'Hiệu quả cao'
  if (useCount >= 3 || totalRevenue >= 1000000) return 'Đang hiệu quả'
  if (totalDiscount > 0) return 'Cần theo dõi'
  return 'Chưa có dữ liệu'
}

const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function PromotionsSection({
  loading,
  onCreate,
  onDelete,
  onEdit,
  onPageChange,
  onSearchChange,
  onSortChange,
  onStatusFilterChange,
  page,
  promotions,
  promotionUsage,
  searchTerm,
  sortMode,
  statusFilter,
  totalPages,
}) {
  const [activeTab, setActiveTab] = useState('list')
  const [selectedPromotionId, setSelectedPromotionId] = useState('all')
  const activeCount = promotions.filtered.filter((promotion) => promotion.status === 'Active').length
  const inactiveCount = promotions.filtered.filter((promotion) => promotion.status === 'Inactive').length
const usageRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()

    return promotionUsage
      .filter((invoice) => invoice.promotionId || invoice.promotionName)
      .filter((invoice) => {
        if (!keyword) return true

        return [invoice.code, invoice.customerName, invoice.promotionName, invoice.cashierName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
  }, [promotionUsage, searchTerm])
  const campaignRows = useMemo(() => {
    const campaigns = new Map()

    usageRows.forEach((invoice) => {
      const key = String(invoice.promotionId || invoice.promotionName || 'unknown')
      const current = campaigns.get(key) || {
        id: key,
        invoices: [],
        name: invoice.promotionName || 'Khuyến mãi',
        totalDiscount: 0,
        totalRevenue: 0,
        useCount: 0,
      }

      current.invoices.push(invoice)
      current.totalDiscount += getInvoiceDiscountAmount(invoice)
      current.totalRevenue += Number(invoice.totalAmount || 0)
      current.useCount += 1
      campaigns.set(key, current)
    })

    return Array.from(campaigns.values()).sort((first, second) => second.useCount - first.useCount)
  }, [usageRows])
  const selectedCampaign = selectedPromotionId === 'all'
    ? null
    : campaignRows.find((campaign) => campaign.id === selectedPromotionId)
  const visibleUsageRows = selectedCampaign ? selectedCampaign.invoices : usageRows
  const historyTotals = campaignRows.reduce(
    (summary, campaign) => {
      summary.totalDiscount += campaign.totalDiscount
      summary.totalRevenue += campaign.totalRevenue
      summary.useCount += campaign.useCount
      return summary
    },
    { totalDiscount: 0, totalRevenue: 0, useCount: 0 },
  )

  return (
    <section className="promotion-redesign">
      <div className="promotion-stat-grid">
        <article>
          <div>
            <span>Đang chạy</span>
            <strong>{activeCount}</strong>
          </div>
          {renderMaterialIcon('rocket_launch')}
        </article>
        <article>
          <div>
            <span>Tổng chương trình</span>
            <strong>{promotions.filtered.length}</strong>
          </div>
          {renderMaterialIcon('confirmation_number')}
        </article>
        <article>
          <div>
            <span>Đã tắt</span>
            <strong>{inactiveCount}</strong>
          </div>
          {renderMaterialIcon('pause_circle')}
        </article>
        <article>
          <div>
            <span>Đã giảm cho khách</span>
            <strong>{formatCurrency(historyTotals.totalDiscount)}</strong>
          </div>
          {renderMaterialIcon('savings')}
        </article>
      </div>

      <section className="promotion-filter-bar" aria-label="Tìm kiếm và lọc khuyến mãi">
        <div className="promotion-tabs" aria-label="Chức năng khuyến mãi">
          <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')} type="button">Danh sách chương trình</button>
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')} type="button">Lịch sử sử dụng</button>
        </div>
        <div className="promotion-filter-controls">
          <label className="promotion-search">
            {renderMaterialIcon('search')}
            <input
              maxLength="100"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm tên khuyến mãi..."
              type="search"
              value={searchTerm}
            />
          </label>
          {activeTab === 'list' && (
            <>
              <label className="promotion-select">
                {renderMaterialIcon('filter_list')}
                <select onChange={(event) => onStatusFilterChange(event.target.value)} value={statusFilter}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Active">Đang bật</option>
                  <option value="Inactive">Đã tắt</option>
                </select>
              </label>
              <label className="promotion-select">
                {renderMaterialIcon('sort')}
                <select onChange={(event) => onSortChange(event.target.value)} value={sortMode}>
                  <option value="newest">Sắp xếp</option>
                  <option value="name">Theo tên</option>
                  <option value="value">Theo giá trị</option>
                  <option value="status">Theo trạng thái</option>
                </select>
              </label>
            </>
          )}
        </div>
      </section>

      {activeTab === 'list' ? (
        <section className="promotion-table-card">
        <header>
          <div className="promotion-list-title">
            <h2>Danh sách khuyến mãi</h2>
            <span>Đang hiển thị {promotions.visible.length} trên {promotions.filtered.length} kết quả</span>
          </div>
          <div className="promotion-toolbar-controls">
            <button className="promotion-primary-button compact" onClick={onCreate} type="button">
              {renderMaterialIcon('add')}
              <span>Thêm khuyến mãi</span>
            </button>
          </div>
        </header>

        <div className="promotion-table-scroll">
          <table className="promotion-table">
            <thead>
              <tr>
                <th style={{textAlign:'center'}}>ID</th>
                <th style={{textAlign:'center'}}>Mã KM</th>
                <th>Tên KM</th>
                <th>Loại</th>
                <th>Giá trị</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th style={{textAlign:'center'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="admin-empty-state">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : promotions.visible.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="admin-empty-state">
                      <Percent aria-hidden="true" />
                      <strong>Chưa có khuyến mãi nào</strong>
                      <span>Tạo chương trình khuyến mãi mới để áp dụng ưu đãi cho khách hàng</span>
                    </div>
                  </td>
                </tr>
              ) : (
                promotions.visible.map((promotion, index) => (
                  <tr key={promotion.id}>
                    <td style={{textAlign:'center'}}><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d',fontSize:'1rem'}}>KM{String(promotion.id).padStart(3,'0')}</span></td>
                    <td style={{textAlign:'center'}}>
                      {promotion.code
                        ? <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'1rem'}}>{promotion.code}</span>
                        : <span style={{color:'#aaa',fontSize:'0.8rem'}}>—</span>}
                    </td>
                    <td><strong>{promotion.name}</strong></td>
                    <td>
                      <span className="promotion-type-chip">{getPromotionTypeLabel(promotion)}</span>
                    </td>
                    <td className="promotion-value-cell">{formatDiscount(promotion)}</td>
                    <td>
                      <div className="promotion-date-cell">
                        <span>{formatDate(promotion.startDate)}</span>
                        <small>đến {formatDate(promotion.endDate)}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`promotion-status ${promotionStatusClasses[promotion.status] || 'inactive'}`}>
                        {promotionStatusLabels[promotion.status] || promotion.status}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <div className="promotion-row-actions" style={{justifyContent:'center'}}>
                        <button aria-label="Sửa khuyến mãi" onClick={() => onEdit(promotion)} type="button">
                          {renderMaterialIcon('edit')}
                        </button>
                        <button aria-label="Xóa khuyến mãi" className="danger" onClick={() => onDelete(promotion)} type="button">
                          {renderMaterialIcon('delete')}
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
          itemLabel="khuyến mãi"
          onPageChange={onPageChange}
          totalItems={promotions.filtered.length}
          totalPages={totalPages}
          visibleCount={promotions.visible.length}
        />
      </section>
      ) : (
        <>
          <section className="promotion-history-summary" aria-label="Tổng quan hiệu quả khuyến mãi">
            <article>
              <span>Lượt dùng mã</span>
              <strong>{historyTotals.useCount}</strong>
            </article>
            <article>
              <span>Tổng tiền đã giảm</span>
              <strong>{formatCurrency(historyTotals.totalDiscount)}</strong>
            </article>
            <article>
              <span>Doanh thu sau giảm</span>
              <strong>{formatCurrency(historyTotals.totalRevenue)}</strong>
            </article>
          </section>

          <section className="promotion-table-card">
            <header>
              <div className="promotion-list-title">
                <h2>Hiệu quả chiến dịch</h2>
                <span>Mỗi dòng là một mã khuyến mãi đã được áp dụng</span>
              </div>
            </header>
            <div className="promotion-table-scroll">
              <table className="promotion-table">
                <thead>
                  <tr>
                    <th>Mã khuyến mãi</th>
                    <th>Số lần dùng</th>
                    <th>Tổng tiền đã giảm</th>
                    <th>Doanh thu sau giảm</th>
                    <th>Giảm TB/hóa đơn</th>
                    <th>Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7"><div className="admin-empty-state">Đang tải dữ liệu...</div></td>
                    </tr>
                  ) : campaignRows.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="admin-empty-state">
                          <Percent aria-hidden="true" />
                          <strong>Chưa có lịch sử sử dụng</strong>
                          <span>Hóa đơn có áp dụng khuyến mãi sẽ hiển thị tại đây</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campaignRows.map((campaign) => (
                      <tr
                        className={selectedPromotionId === campaign.id ? 'promotion-selected-row' : ''}
                        key={campaign.id}
                        onClick={() => setSelectedPromotionId(campaign.id)}
                      >
                        <td><strong>{campaign.name}</strong></td>
                        <td>{campaign.useCount}</td>
                        <td className="promotion-value-cell">{formatCurrency(campaign.totalDiscount)}</td>
                        <td>{formatCurrency(campaign.totalRevenue)}</td>
                        <td>{formatCurrency(campaign.useCount ? campaign.totalDiscount / campaign.useCount : 0)}</td>
                        <td><span className="promotion-type-chip">{getCampaignRating(campaign)}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="promotion-table-card">
            <header>
              <div className="promotion-list-title">
                <h2>Hóa đơn đã dùng mã</h2>
                <span>{selectedCampaign ? selectedCampaign.name : 'Tất cả mã'} - {visibleUsageRows.length} hóa đơn</span>
              </div>
              {selectedCampaign && (
                <button className="promotion-clear-selection" onClick={() => setSelectedPromotionId('all')} type="button">Xem tất cả</button>
              )}
            </header>

            <div className="promotion-table-scroll">
              <table className="promotion-table">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Khuyến mãi</th>
                    <th>Khách hàng</th>
                    <th>Tổng trước giảm</th>
                    <th>Đã giảm</th>
                    <th>Tổng sau giảm</th>
                    <th>Ngày dùng</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsageRows.length === 0 ? (
                    <tr>
                      <td colSpan="7"><div className="admin-empty-state">Chưa có hóa đơn phù hợp</div></td>
                    </tr>
                  ) : (
                    visibleUsageRows.map((invoice) => (
                      <tr key={invoice.id}>
                        <td><strong>{invoice.code || `#${invoice.id}`}</strong></td>
                        <td>{invoice.promotionName || 'Khuyến mãi'}</td>
                        <td>{invoice.customerName || 'Khách lẻ'}</td>
                        <td>{formatCurrency(invoice.subtotal || Number(invoice.totalAmount || 0) + getInvoiceDiscountAmount(invoice))}</td>
                        <td className="promotion-value-cell">{formatCurrency(getInvoiceDiscountAmount(invoice))}</td>
                        <td>{formatCurrency(invoice.totalAmount)}</td>
                        <td>{formatDateTime(invoice.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  )
}

PromotionsSection.propTypes = {
  loading: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onStatusFilterChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  promotions: PropTypes.shape({
    filtered: PropTypes.arrayOf(promotionShape).isRequired,
    visible: PropTypes.arrayOf(promotionShape).isRequired,
  }).isRequired,
  promotionUsage: PropTypes.arrayOf(invoiceShape).isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
  statusFilter: PropTypes.string.isRequired,
  totalPages: PropTypes.number.isRequired,
}

export default PromotionsSection
