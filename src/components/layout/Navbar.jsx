import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  History,
  UserCircle,
  ShieldCheck,
  LogOut,
  Trophy,
} from 'lucide-react';
import Logo from '../common/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { initials } from '../../utils/format.js';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore Exams' },
  { to: '/practice', label: 'Practice' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { isAuthenticated, isAdmin, displayName, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menus when the route changes.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close the user dropdown when clicking elsewhere.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('You have been logged out.');
      navigate('/');
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const navLinkClass = ({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`;

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Logo />

        <nav className="navbar__links" aria-label="Main navigation">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-menu__trigger"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="avatar">{initials(displayName)}</span>
                <span className="user-menu__name">{displayName.split(' ')[0]}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="user-menu__dropdown" role="menu">
                  <Link to="/dashboard" role="menuitem" className="user-menu__item">
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <Link to="/history" role="menuitem" className="user-menu__item">
                    <History size={16} /> Test history
                  </Link>
                  <Link to="/leaderboard" role="menuitem" className="user-menu__item">
                    <Trophy size={16} /> Leaderboard
                  </Link>
                  <Link to="/profile" role="menuitem" className="user-menu__item">
                    <UserCircle size={16} /> Profile settings
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" role="menuitem" className="user-menu__item">
                      <ShieldCheck size={16} /> Admin panel
                    </Link>
                  )}
                  <button type="button" role="menuitem" className="user-menu__item user-menu__item--danger" onClick={handleLogout}>
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm navbar__login">
                Login
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Sign Up
              </Link>
            </>
          )}

          <button
            type="button"
            className="navbar__toggle"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu" id="mobile-menu">
          <nav className="container mobile-menu__inner" aria-label="Mobile navigation">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
            <div className="mobile-menu__divider" />
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/history" className={navLinkClass}>Test history</NavLink>
                <NavLink to="/leaderboard" className={navLinkClass}>Leaderboard</NavLink>
                <NavLink to="/profile" className={navLinkClass}>Profile settings</NavLink>
                {isAdmin && <NavLink to="/admin" className={navLinkClass}>Admin panel</NavLink>}
                <button type="button" className="navbar__link navbar__link--button" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <div className="mobile-menu__buttons">
                <Link to="/login" className="btn btn--outline btn--block">Login</Link>
                <Link to="/register" className="btn btn--primary btn--block">Sign Up</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
