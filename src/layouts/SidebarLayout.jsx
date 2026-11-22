import { NavLink, Outlet } from 'react-router-dom';

/** Two-column layout (sidebar navigation + content). Becomes a tab strip on mobile. */
export default function SidebarLayout({ heading, subheading, links }) {
  return (
    <div className="container sidebar-layout">
      <aside className="sidebar">
        <div className="sidebar__head">
          <h2 className="sidebar__title">{heading}</h2>
          {subheading && <p className="sidebar__sub">{subheading}</p>}
        </div>
        <nav className="sidebar__nav" aria-label={heading}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="sidebar-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
