import { UserRound } from 'lucide-react'
import PropTypes from 'prop-types'
import { navItemShape } from '../../utils/adminPropTypes'

const formatAssignedShift = (shiftAssignment) => {
  if (!shiftAssignment) return ''

  const startTime = String(shiftAssignment.startTime || '').slice(0, 5)
  const endTime = String(shiftAssignment.endTime || '').slice(0, 5)
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : ''
  const shiftName = String(shiftAssignment.shiftName || '').trim()
  const normalizedShiftName = shiftName.toLowerCase()
  const displayName =
    shiftName && normalizedShiftName !== 'full' && !normalizedShiftName.startsWith('ca ')
      ? `Ca ${normalizedShiftName}`
      : shiftName

  return [displayName, timeRange].filter(Boolean).join(' • ')
}

function AdminHeader({
  activeNavItem,
  currentUser,
  isAccountManagement,
  isAreaManagement,
  isCategoryManagement,
  isEmployeeManagement,
  isInvoiceManagement,
  isInventoryManagement,
  isMenuManagement,
  isPromotionManagement,
  onOpenProfile,
}) {
  const showDescription =
    !isAccountManagement &&
    !isAreaManagement &&
    !isCategoryManagement &&
    !isEmployeeManagement &&
    !isInvoiceManagement &&
    !isInventoryManagement &&
    !isMenuManagement &&
    !isPromotionManagement

  const assignedShiftLabel = formatAssignedShift(currentUser.shiftAssignment)
  const renderProfileButton = () => (
    <button className="admin-secondary-action admin-user-chip" onClick={onOpenProfile} type="button">
      <div>
        <strong>{currentUser.fullName || currentUser.username || 'Admin'}</strong>
        {assignedShiftLabel && <span>{assignedShiftLabel}</span>}
      </div>
      <i>
        <UserRound aria-hidden="true" />
      </i>
    </button>
  )

  return (
    <header className="admin-header-shell">
      <div className="admin-header">
        <div>
          <h1>{isEmployeeManagement ? 'Quản lý nhân viên' : activeNavItem.title}</h1>
          {showDescription && <p>{activeNavItem.description}</p>}
        </div>

        <div className="admin-header-actions">
          {renderProfileButton()}
        </div>
      </div>
    </header>
  )
}

AdminHeader.propTypes = {
  activeNavItem: navItemShape.isRequired,
  currentUser: PropTypes.shape({
    fullName: PropTypes.string,
    shiftAssignment: PropTypes.shape({
      endTime: PropTypes.string,
      shiftName: PropTypes.string,
      startTime: PropTypes.string,
    }),
    username: PropTypes.string,
  }).isRequired,
  isAccountManagement: PropTypes.bool.isRequired,
  isAreaManagement: PropTypes.bool.isRequired,
  isCategoryManagement: PropTypes.bool.isRequired,
  isEmployeeManagement: PropTypes.bool.isRequired,
  isInvoiceManagement: PropTypes.bool.isRequired,
  isInventoryManagement: PropTypes.bool.isRequired,
  isMenuManagement: PropTypes.bool.isRequired,
  isPromotionManagement: PropTypes.bool.isRequired,
  onOpenProfile: PropTypes.func.isRequired,
}

export default AdminHeader
