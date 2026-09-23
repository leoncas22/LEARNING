import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Frontend route protection is UX only — hiding a link doesn't secure
 * anything. The backend re-validates role and companyId on every request
 * regardless of what this component decides. See authenticate/authorize/
 * companyAccess middleware.
 */
export function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading, homePathForRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-espresso/60">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, just not allowed here — send them to their own dashboard
    // rather than a dead end.
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
