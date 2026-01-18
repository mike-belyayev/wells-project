// src/auth/ProtectedRoute.tsx
import { useAuth } from './AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import type { ReactNode } from 'react';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Additional admin check
  if (!user.isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

// You can keep this if you still want a default export
const ProtectedRouteExport = ProtectedRoute;
export default ProtectedRouteExport;