import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageLoader } from '../common/Loaders.jsx';
import EmptyState from '../common/EmptyState.jsx';

/**
 * Role-based guard: only users whose profile role is "admin" may see the nested routes.
 * (This is a convenience for the UI - the real protection is the database's
 * Row Level Security, which rejects admin operations from non-admin accounts.)
 */
export default function AdminRoute({ staff = false }) {
  const { session, initializing, profileLoading, isAdmin, isStaff } = useAuth();
  const allowed = staff ? isStaff : isAdmin;
  const location = useLocation();

  if (initializing || profileLoading) return <PageLoader label="Checking permissions…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!allowed) {
    return (
      <div className="container section">
        <EmptyState
          icon={ShieldAlert}
          title={staff ? "Teachers and administrators only" : "Administrators only"}
          message="You do not have permission to open this page."
          action={
            <Link to="/dashboard" className="btn btn--primary">
              Back to my dashboard
            </Link>
          }
        />
      </div>
    );
  }
  return <Outlet />;
}
