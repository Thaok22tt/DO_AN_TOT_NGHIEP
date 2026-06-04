import { X } from 'lucide-react'
import PropTypes from 'prop-types'
import { accountShape } from '../../../utils/adminPropTypes'

function PasswordResetModal({ account, error, form, onChange, onClose, onSubmit, saving }) {
  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal admin-confirm-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <h2>Reset mật khẩu</h2>
          <button aria-label="Đóng" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="admin-confirm-body">
          <p>
            Đặt mật khẩu mới cho tài khoản <strong>{account.username}</strong>.
          </p>
        </div>

        {error && <div className="admin-inline-error">{error}</div>}

        <div className="admin-form-grid">
          <label className="admin-form-full">
            <span>Mật khẩu mới</span>
            <input minLength="6" name="password" onChange={onChange} required type="password" value={form.password} />
          </label>
          <label className="admin-form-full">
            <span>Nhập lại mật khẩu</span>
            <input minLength="6" name="confirmPassword" onChange={onChange} required type="password" value={form.confirmPassword} />
          </label>
        </div>

        <div className="admin-modal-actions admin-confirm-actions">
          <button className="admin-secondary-action" onClick={onClose} type="button">
            Hủy
          </button>
          <button className="admin-primary-action" disabled={saving} type="submit">
            {saving ? 'Đang lưu...' : 'Reset mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  )
}

PasswordResetModal.propTypes = {
  account: accountShape.isRequired,
  error: PropTypes.string.isRequired,
  form: PropTypes.shape({
    confirmPassword: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
}

export default PasswordResetModal
