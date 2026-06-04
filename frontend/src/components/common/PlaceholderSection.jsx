import { navItemShape } from '../../utils/adminPropTypes'

function PlaceholderSection({ navItem }) {
  const ActiveNavIcon = navItem.icon

  return (
    <section className="admin-accounts-panel admin-empty-panel">
      <div className="admin-accounts-title">
        <h2>{navItem.title}</h2>
        <span>{navItem.label}</span>
      </div>
      <div className="admin-empty-state">
        <ActiveNavIcon aria-hidden="true" />
        <strong>{navItem.title}</strong>
        <span>{navItem.description}</span>
      </div>
    </section>
  )
}

PlaceholderSection.propTypes = {
  navItem: navItemShape.isRequired,
}

export default PlaceholderSection
