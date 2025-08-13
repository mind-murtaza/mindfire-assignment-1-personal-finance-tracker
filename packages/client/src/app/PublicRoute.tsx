import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../services/auth'

interface PublicRouteProps { children: ReactNode }

export function PublicRoute({ children }: PublicRouteProps) {
  const location = useLocation()
  const token = getToken()
  if (token) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export default PublicRoute


