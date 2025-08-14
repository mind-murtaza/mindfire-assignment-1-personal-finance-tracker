import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import CategoriesPage from '../pages/Categories'
import TransactionsPage from '../pages/Transactions'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Profile from '../pages/Profile'


function DashboardStub() {
  return (
    <div className="container py-8">
      <h2 className="text-3xl font-semibold text-slate-900 mb-4">Dashboard</h2>
      <p className="text-slate-600">Soon: summary cards and charts per roadmap.</p>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardStub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}


