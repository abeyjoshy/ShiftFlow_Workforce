import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { AppShell } from './layout/AppShell';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loadingScreen">
        <div className="loadingSpinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    const employeeToken = localStorage.getItem('shift_app_employee_token');
    if (employeeToken) {
      return <Navigate to="/employee-dashboard" replace />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
