import { Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'

function AreaModal({ form, mode, onChange, onClose, onSubmit, saving }) {
  const isCreate = mode === 'area-create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm khu vực' : 'Cập nhật khu vực'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Tên khu vực</span>
            <input maxLength="100" name="name" onChange={onChange} required type="text" value={form.name} />
          </label>
          <label className="admin-form-full">
            <span>Mô tả</span>
            <textarea maxLength="300" name="description" onChange={onChange} rows="4" value={form.description} />
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            <Plus aria-hidden="true" />
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm khu vực' : 'Lưu khu vực'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

AreaModal.propTypes = {
  form: PropTypes.shape({
    description: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['area-create', 'area-edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
}

export default AreaModal
