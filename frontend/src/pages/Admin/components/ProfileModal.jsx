import { X } from 'lucide-react'
import PropTypes from 'prop-types'

function ProfileModal({
  error,
  form,
  mode,
  onChange,
  onClose,
  onModeChange,
  onSubmit,
  passwordForm,
  saving,
}) {
  const isPasswordMode = mode === 'password'

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal admin-profile-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>{isPasswordMode ? 'Đổi mật khẩu' : 'Hồ sơ cá nhân'}</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-area-tabs admin-profile-tabs" role="tablist" aria-label="Chọn chức năng cá nhân">
          <button className={!isPasswordMode ? 'active' : ''} onClick={() => onModeChange('profile')} type="button">
            Cập nhật hồ sơ
          </button>
          <button className={isPasswordMode ? 'active' : ''} onClick={() => onModeChange('password')} type="button">
            Đổi mật khẩu
          </button>
        </div>

        {error && <div className="admin-inline-error">{error}</div>}

        {isPasswordMode ? (
          <div className="admin-form-grid">
            <label>
              <span>Mật khẩu hiện tại</span>
              <input
                autoComplete="current-password"
                name="currentPassword"
                onChange={onChange}
                required
                type="password"
                value={passwordForm.currentPassword}
              />
            </label>
            <label>
              <span>Mật khẩu mới</span>
              <input
                autoComplete="new-password"
                minLength="6"
                name="newPassword"
                onChange={onChange}
                required
                type="password"
                value={passwordForm.newPassword}
              />
            </label>
            <label>
              <span>Nhập lại mật khẩu mới</span>
              <input
                autoComplete="new-password"
                minLength="6"
                name="confirmPassword"
                onChange={onChange}
                required
                type="password"
                value={passwordForm.confirmPassword}
              />
            </label>
          </div>
        ) : (
          <div className="admin-form-grid">
            <label>
              <span>Họ tên</span>
              <input name="fullName" onChange={onChange} required type="text" value={form.fullName} />
            </label>
            <label>
              <span>Email</span>
              <input name="email" onChange={onChange} type="email" value={form.email} />
            </label>
            <label>
              <span>Điện thoại</span>
              <input name="phoneNumber" onChange={onChange} type="tel" value={form.phoneNumber} />
            </label>
            <label>
              <span>Tên đăng nhập</span>
              <input disabled type="text" value={form.username} />
            </label>
            <label>
              <span>Vai trò</span>
              <input disabled type="text" value={form.role} />
            </label>
          </div>
        )}

        <div className="admin-modal-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}

ProfileModal.propTypes = {
  error: PropTypes.string.isRequired,
  form: PropTypes.shape({
    email: PropTypes.string,
    fullName: PropTypes.string,
    phoneNumber: PropTypes.string,
    role: PropTypes.string,
    username: PropTypes.string,
  }).isRequired,
  mode: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onModeChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  passwordForm: PropTypes.shape({
    confirmPassword: PropTypes.string,
    currentPassword: PropTypes.string,
    newPassword: PropTypes.string,
  }).isRequired,
  saving: PropTypes.bool.isRequired,
}

export default ProfileModal
