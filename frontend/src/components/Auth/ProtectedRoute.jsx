import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export default function ProtectedRoute({ children, requiredRole = 'admin' }) {
  const { user, token } = useAppStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
