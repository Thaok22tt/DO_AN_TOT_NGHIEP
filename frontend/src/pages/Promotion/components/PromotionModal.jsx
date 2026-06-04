import { Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'
import DateInput from '../../../components/common/DateInput'

function PromotionModal({ form, mode, onChange, onClose, onSubmit, saving }) {
  const isCreate = mode === 'promotion-create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm khuyến mại' : 'Cập nhật khuyến mại'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-full">
            <span>Tên khuyến mại</span>
            <input maxLength="150" name="name" onChange={onChange} required type="text" value={form.name} />
          </label>
          <label>
            <span>Loại giảm giá</span>
            <select name="discountType" onChange={onChange} required value={form.discountType}>
              <option value="">Chọn loại giảm giá</option>
              <option value="Percent">Phần trăm (%)</option>
              <option value="Fixed">Số tiền cố định</option>
            </select>
          </label>
          <label>
            <span>Giá trị giảm</span>
            <input inputMode="numeric" name="discountValue" onChange={onChange} pattern="[0-9.]*" required type="text" value={form.discountValue} />
          </label>
          <label>
            <span>Ngày bắt đầu</span>
            <DateInput name="startDate" onChange={onChange} required value={form.startDate} />
          </label>
          <label>
            <span>Ngày kết thúc</span>
            <DateInput name="endDate" onChange={onChange} required value={form.endDate} />
          </label>
          <label>
            <span>Trạng thái</span>
            <select name="status" onChange={onChange} required value={form.status}>
              <option value="">Chọn trạng thái</option>
              <option value="Active">Đang bật</option>
              <option value="Inactive">Đã tắt</option>
            </select>
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            <Plus aria-hidden="true" />
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm khuyến mại' : 'Lưu khuyến mại'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

PromotionModal.propTypes = {
  form: PropTypes.shape({
    code: PropTypes.string,
    discountType: PropTypes.string.isRequired,
    discountValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    endDate: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['promotion-create', 'promotion-edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
}

export default PromotionModal
