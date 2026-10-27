import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const AdminRoute: React.FC = () => {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">Carregando...</div>;
  }

  return user?.isAdmin ? <Outlet /> : <Navigate to="/whatsapp" replace />;
};
