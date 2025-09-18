import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const loc = useLocation()

  if (loading) return <div className="p-6">Carregando…</div>
  if (!session) return <Navigate to="/entrar" replace state={{ from: loc.pathname }} />
  return <Outlet />
}
