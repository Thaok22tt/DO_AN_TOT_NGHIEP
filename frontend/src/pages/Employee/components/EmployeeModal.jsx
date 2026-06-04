import { X } from 'lucide-react'
import PropTypes from 'prop-types'
import DateInput from '../../../components/common/DateInput'
import { accountShape, employeeShape } from '../../../utils/adminPropTypes'
import { renderMaterialIcon } from '../../../utils/adminUtils'

function EmployeeModal({ assignableAccounts, form, mode, onChange, onClose, onSubmit, saving, selectedEmployee }) {
  const isCreate = mode === 'employee-create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal employee-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm nhân viên' : 'Cập nhật nhân viên'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid employee-form-grid">
          <label>
            <span>Họ và tên</span>
            <input maxLength="100" name="fullName" onChange={onChange} required type="text" value={form.fullName} />
          </label>
          <label>
            <span>Tài khoản</span>
            {isCreate ? (
              <select name="accountId" onChange={onChange} required value={form.accountId}>
                <option value="">Chọn tài khoản</option>
                {assignableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username} {account.fullName ? `- ${account.fullName}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input readOnly type="text" value={selectedEmployee?.username || ''} />
            )}
          </label>
          <label>
            <span>Số điện thoại</span>
            <input maxLength="20" name="phoneNumber" onChange={onChange} type="tel" value={form.phoneNumber} />
          </label>
          <label>
            <span>Chức vụ</span>
            <select name="position" onChange={onChange} value={form.position}>
              <option value="">Chọn công việc</option>
              <option value="Nhân viên">Nhân viên</option>
              <option value="Pha chế">Pha chế</option>
            </select>
          </label>
          <label>
            <span>Ca làm</span>
            <select name="workShift" onChange={onChange} value={form.workShift}>
              <option value="">Chọn ca làm</option>
              <option value="Sáng">Ca sáng: 06h00 - 11h00</option>
              <option value="Chiều">Ca chiều: 11h00 - 17h00</option>
              <option value="Tối">Ca tối: 17h00 - 22h00</option>
              <option value="Full">Full: 08h00 - 17h00</option>
            </select>
          </label>
          <label>
            <span>Ngày sinh</span>
            <DateInput name="birthDate" onChange={onChange} value={form.birthDate} />
          </label>
          <label>
            <span>Ngày vào làm</span>
            <DateInput name="hireDate" onChange={onChange} value={form.hireDate} />
          </label>
          <label>
            <span>Giới tính</span>
            <select name="gender" onChange={onChange} value={form.gender}>
              <option value="">Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </label>
          <label>
            <span>Lương theo giờ</span>
            <input
              inputMode="numeric"
              maxLength="15"
              name="hourlyRate"
              onChange={onChange}
              placeholder="VD: 35.000"
              type="text"
              value={form.hourlyRate}
            />
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            {renderMaterialIcon(isCreate ? 'badge' : 'edit')}
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm nhân viên' : 'Lưu nhân viên'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

EmployeeModal.propTypes = {
  assignableAccounts: PropTypes.arrayOf(accountShape).isRequired,
  form: PropTypes.shape({
    accountId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    birthDate: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired,
    gender: PropTypes.string.isRequired,
    hireDate: PropTypes.string.isRequired,
    hourlyRate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    phoneNumber: PropTypes.string.isRequired,
    position: PropTypes.string.isRequired,
    workShift: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['employee-create', 'employee-edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  selectedEmployee: employeeShape,
}

export default EmployeeModal
