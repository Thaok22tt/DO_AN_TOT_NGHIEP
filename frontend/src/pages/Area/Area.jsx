import { SquareMenu } from 'lucide-react'
import PropTypes from 'prop-types'
import Pagination from '../../components/common/Pagination'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { areaShape, tableShape } from '../../utils/adminPropTypes'
import { renderMaterialIcon } from '../../utils/adminUtils'

const tableStatusLabels = {
  Available: 'Trống',
  Preparing: 'Pha chế',
  Occupied: 'Đang sử dụng',
}

const tableStatusClasses = {
  Available: 'available',
  Preparing: 'preparing',
  Occupied: 'occupied',
}

function AreasSection({
  areas,
  areaFilter,
  loading,
  onAreaFilterChange,
  onCreateTable,
  onPageChange,
  onSearchChange,
  onSortChange,
  onTableDelete,
  onTableEdit,
  page,
  searchTerm,
  sortMode,
  tableTotalPages,
  tables,
}) {
  return (
    <>
      <section className="admin-toolbar" aria-label="Tìm kiếm và lọc">
        <div className="admin-toolbar-right">
          <label className="admin-search">
            {renderMaterialIcon('search')}
            <input
              maxLength="100"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm kiếm bàn..."
              type="search"
              value={searchTerm}
            />
          </label>

          <div className="admin-toolbar-controls">
            <label className="admin-select-wrap">
              {renderMaterialIcon('sort')}
              <select onChange={(event) => onSortChange(event.target.value)} value={sortMode}>
                <option value="newest">Sắp xếp</option>
                <option value="name">Theo tên</option>
              </select>
            </label>

            <label className="admin-select-wrap">
              {renderMaterialIcon('map')}
              <select onChange={(event) => onAreaFilterChange(event.target.value)} value={areaFilter}>
                <option value="all">Tất cả khu vực</option>
                {areas.filtered.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="admin-accounts-panel">
        <div className="admin-accounts-title">
          <div>
            <h2>Danh sách bàn</h2>
            <span>
              Đang hiển thị {tables.visible.length} trên {tables.filtered.length} kết quả
            </span>
          </div>
          <button className="admin-primary-action" disabled={areas.filtered.length === 0} onClick={onCreateTable} type="button">
            {renderMaterialIcon('add')}
            <span>Thêm bàn</span>
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-accounts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên bàn</th>
                <th>Khu vực</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">
                    <div className="admin-empty-state">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : tables.visible.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="admin-empty-state">
                      <SquareMenu aria-hidden="true" />
                      <strong>Chưa có bàn nào</strong>
                      <span>Thêm bàn và gán vào khu vực phục vụ tương ứng</span>
                    </div>
                  </td>
                </tr>
              ) : (
                tables.visible.map((table, index) => (
                  <tr key={table.id}>
                    <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d'}}>BAN{String(table.id).padStart(3,'0')}</span></td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-avatar">{String(table.name || '?').trim().charAt(0).toUpperCase()}</span>
                        <strong>{table.name}</strong>
                      </div>
                    </td>
                    <td>{table.areaName || 'Chưa cập nhật'}</td>
                    <td>
                      <span className={`admin-status-chip ${tableStatusClasses[table.status] || 'available'}`}>
                        {tableStatusLabels[table.status] || table.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button aria-label="Sửa bàn" onClick={() => onTableEdit(table)} type="button">
                          {renderMaterialIcon('edit')}
                        </button>
                        <button aria-label="Xóa bàn" className="admin-danger-action" onClick={() => onTableDelete(table)} type="button">
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
          itemLabel="bàn"
          onPageChange={onPageChange}
          totalItems={tables.filtered.length}
          totalPages={tableTotalPages}
          visibleCount={tables.visible.length}
        />
      </section>
    </>
  )
}

AreasSection.propTypes = {
  areas: PropTypes.shape({
    filtered: PropTypes.arrayOf(areaShape).isRequired,
    visible: PropTypes.arrayOf(areaShape).isRequired,
  }).isRequired,
  areaFilter: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  onAreaFilterChange: PropTypes.func.isRequired,
  onCreateTable: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onTableDelete: PropTypes.func.isRequired,
  onTableEdit: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
  tableTotalPages: PropTypes.number.isRequired,
  tables: PropTypes.shape({
    filtered: PropTypes.arrayOf(tableShape).isRequired,
    visible: PropTypes.arrayOf(tableShape).isRequired,
  }).isRequired,
}

export default AreasSection
