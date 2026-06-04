import { Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { areaShape } from '../../../utils/adminPropTypes'

function TableModal({ areas, form, mode, onChange, onClose, onSubmit, saving }) {
  const isCreate = mode === 'table-create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm bàn' : 'Cập nhật bàn'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Tên bàn</span>
            <input maxLength="100" name="name" onChange={onChange} required type="text" value={form.name} />
          </label>
          <label>
            <span>Khu vực</span>
            <select name="areaId" onChange={onChange} required value={form.areaId}>
              <option value="">Chọn khu vực</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-full">
            <span>Trạng thái</span>
            <select name="status" onChange={onChange} required value={form.status}>
              <option value="">Chọn trạng thái</option>
              <option value="Available">Trống</option>
              <option value="Preparing">Pha chế</option>
              <option value="Occupied">Đang sử dụng</option>
            </select>
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            <Plus aria-hidden="true" />
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm bàn' : 'Lưu bàn'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

TableModal.propTypes = {
  areas: PropTypes.arrayOf(areaShape).isRequired,
  form: PropTypes.shape({
    areaId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['table-create', 'table-edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
}

export default TableModal
