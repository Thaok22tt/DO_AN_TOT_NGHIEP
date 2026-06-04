import { KeyRound, Plus, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { roleShape } from '../../../utils/adminPropTypes'

function AccountModal({ changePassword, form, mode, onChange, onClose, onSetChangePassword, onSubmit, roles, saving }) {
  const isCreate = mode === 'create'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isCreate ? 'Thêm tài khoản' : 'Cập nhật tài khoản'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Tên đăng nhập</span>
            <input name="username" onChange={onChange} required type="text" value={form.username} />
          </label>

          {isCreate ? (
            <label>
              <span>Mật khẩu</span>
              <input minLength="6" name="password" onChange={onChange} required type="password" value={form.password} />
            </label>
          ) : (
            <div className="admin-password-panel">
              <span>Mật khẩu</span>
              <div className="admin-password-status">
                <KeyRound aria-hidden="true" />
                <strong>Đã đặt mật khẩu</strong>
              </div>
              <label className="admin-password-toggle">
                <input
                  checked={changePassword}
                  onChange={(event) => {
                    onSetChangePassword(event.target.checked)
                    if (!event.target.checked) {
                      onChange({ target: { name: 'password', value: '' } })
                    }
                  }}
                  type="checkbox"
                />
                <span>Đổi mật khẩu</span>
              </label>
              {changePassword && (
                <input
                  autoFocus
                  minLength="6"
                  name="password"
                  onChange={onChange}
                  placeholder="Nhập mật khẩu mới tối thiểu 6 ký tự"
                  required
                  type="password"
                  value={form.password}
                />
              )}
            </div>
          )}

          <label>
            <span>Họ và tên</span>
            <input name="fullName" onChange={onChange} required type="text" value={form.fullName} />
          </label>
          <label>
            <span>Email</span>
            <input name="email" onChange={onChange} type="email" value={form.email} />
          </label>
          <label>
            <span>Số điện thoại</span>
            <input name="phoneNumber" onChange={onChange} type="tel" value={form.phoneNumber} />
          </label>
          <label>
            <span>Vai trò</span>
            <select name="roleId" onChange={onChange} required value={form.roleId}>
              <option value="">Chọn vai trò</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Trạng thái</span>
            <select name="status" onChange={onChange} required value={form.status}>
              <option value="">Chọn trạng thái</option>
              <option value={1}>Hoạt động</option>
              <option value={0}>Đã khóa</option>
            </select>
          </label>
        </div>

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            <Plus aria-hidden="true" />
            <span>{saving ? (isCreate ? 'Đang thêm...' : 'Đang lưu...') : isCreate ? 'Thêm tài khoản' : 'Lưu tài khoản'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

AccountModal.propTypes = {
  changePassword: PropTypes.bool.isRequired,
  form: PropTypes.shape({
    email: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    phoneNumber: PropTypes.string.isRequired,
    roleId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    username: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSetChangePassword: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  roles: PropTypes.arrayOf(roleShape).isRequired,
  saving: PropTypes.bool.isRequired,
}

export default AccountModal
