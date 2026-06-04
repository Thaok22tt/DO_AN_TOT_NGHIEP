import { X } from 'lucide-react'
import PropTypes from 'prop-types'

function ConfirmModal({ body, cancelLabel = 'Hủy', confirmLabel = 'Xác nhận', loading = false, loadingLabel = 'Đang xử lý...', onClose, onConfirm, title = 'Xác nhận thao tác' }) {
  return (
    <div className="confirm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="confirm-modal-header">
          <h2 id="confirm-modal-title">{title}</h2>
          <button aria-label="Đóng" disabled={loading} onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="confirm-modal-body">
          <p>{body}</p>
        </div>

        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" disabled={loading} onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button className="confirm-modal-primary" disabled={loading} onClick={onConfirm} type="button">
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

ConfirmModal.propTypes = {
  body: PropTypes.node.isRequired,
  cancelLabel: PropTypes.string,
  confirmLabel: PropTypes.string,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
}

export default ConfirmModal
