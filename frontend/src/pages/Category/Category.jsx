import { Boxes } from 'lucide-react'
import PropTypes from 'prop-types'
import Pagination from '../../components/common/Pagination'
import { PAGE_SIZE } from '../../utils/adminConfig'
import { categoryShape } from '../../utils/adminPropTypes'
import { renderMaterialIcon } from '../../utils/adminUtils'

function CategoriesSection({
  categories,
  loading,
  onDelete,
  onEdit,
  onPageChange,
  onSearchChange,
  onSortChange,
  page,
  searchTerm,
  sortMode,
  totalPages,
}) {
  return (
    <>
      <section className="admin-toolbar" aria-label="Tìm kiếm và lọc danh mục">
        <label className="admin-search">
          {renderMaterialIcon('search')}
          <input
            maxLength="100"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm danh mục..."
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
        </div>
      </section>

      <section className="admin-accounts-panel">
        <div className="admin-accounts-title">
          <div>
            <h2>Danh sách danh mục</h2>
            <span>
              Đang hiển thị {categories.visible.length} trên {categories.filtered.length} kết quả
            </span>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-accounts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4">
                    <div className="admin-empty-state">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : categories.visible.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="admin-empty-state">
                      <Boxes aria-hidden="true" />
                      <strong>Chưa có danh mục nào</strong>
                      <span>Bắt đầu bằng cách thêm danh mục đồ uống mới vào hệ thống</span>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.visible.map((category, index) => (
                  <tr key={category.id}>
                    <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#33210d'}}>DM{String(category.id).padStart(3,'0')}</span></td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-avatar">{String(category.name || '?').trim().charAt(0).toUpperCase()}</span>
                        <strong>{category.name}</strong>
                      </div>
                    </td>
                    <td>{category.description || 'Chưa cập nhật'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button aria-label="Sửa danh mục" onClick={() => onEdit(category)} type="button">
                          {renderMaterialIcon('edit')}
                        </button>
                        <button aria-label="Xóa danh mục" className="admin-danger-action" onClick={() => onDelete(category)} type="button">
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
          itemLabel="danh mục"
          onPageChange={onPageChange}
          totalItems={categories.filtered.length}
          totalPages={totalPages}
          visibleCount={categories.visible.length}
        />
      </section>
    </>
  )
}

CategoriesSection.propTypes = {
  categories: PropTypes.shape({
    filtered: PropTypes.arrayOf(categoryShape).isRequired,
    visible: PropTypes.arrayOf(categoryShape).isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  searchTerm: PropTypes.string.isRequired,
  sortMode: PropTypes.string.isRequired,
  totalPages: PropTypes.number.isRequired,
}

export default CategoriesSection
