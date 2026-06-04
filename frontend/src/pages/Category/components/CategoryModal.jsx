import { Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'

function CategoryModal({ form, mode, onChange, onClose, onSubmit, saving }) {
  const isCreate = mode === 'category-create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm danh mục' : 'Cập nhật danh mục'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Tên danh mục</span>
            <input maxLength="100" name="name" onChange={onChange} required type="text" value={form.name} />
          </label>
          <label className="admin-form-full">
            <span>Mô tả</span>
            <textarea maxLength="500" name="description" onChange={onChange} rows="4" value={form.description} />
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            <Plus aria-hidden="true" />
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm danh mục' : 'Lưu danh mục'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

CategoryModal.propTypes = {
  form: PropTypes.shape({
    description: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['category-create', 'category-edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
}

export default CategoryModal
