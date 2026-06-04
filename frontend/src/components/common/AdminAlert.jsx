import PropTypes from 'prop-types'

function AdminAlert({ error, message, onClearError }) {
  if (!error && !message) return null

  if (error) {
    return (
      <div
        className="admin-error-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-label="Thông báo lỗi"
        style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
      >
        <div className="admin-error-dialog-box">
          <header>
            <span className="material-symbols-outlined" style={{ color: '#c0392b', fontSize: 28 }}>error</span>
            <strong>Có lỗi xảy ra</strong>
          </header>
          <p>{error}</p>
          <footer>
            <button onClick={onClearError} type="button">OK</button>
          </footer>
        </div>
      </div>
    )
  }

  return <div className="admin-alert admin-alert-success">{message}</div>
}

AdminAlert.propTypes = {
  error: PropTypes.string,
  message: PropTypes.string,
  onClearError: PropTypes.func,
}

export default AdminAlert
