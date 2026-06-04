import PropTypes from 'prop-types'
import { Coffee } from 'lucide-react'
import { navItems } from '../../utils/adminConfig'
import { renderMaterialIcon } from '../../utils/adminUtils'

function AdminSidebar({ activeNavKey, onLogout, onSelect }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">
        <div className="admin-logo-mark" aria-hidden="true">
          <Coffee />
        </div>
        <div className="admin-logo-text">
          <strong>Mơ Coffee</strong>
          <span>Admin</span>
        </div>
      </div>

      <nav className="admin-nav" aria-label="Điều hướng quản trị">
        {navItems.map((item) => (
          <button
            className={`admin-nav-item ${activeNavKey === item.key ? 'admin-nav-item-active' : ''}`}
            key={item.key}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            {renderMaterialIcon(item.materialIcon)}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-logout-wrap">
        <button className="admin-logout" onClick={onLogout} type="button">
          {renderMaterialIcon('logout')}
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

AdminSidebar.propTypes = {
  activeNavKey: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
}

export default AdminSidebar
