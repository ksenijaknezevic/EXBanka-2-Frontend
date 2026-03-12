import { createBrowserRouter, RouterProvider, Route, Navigate, createRoutesFromElements } from 'react-router-dom'
import PrivateRoute from './router/PrivateRoute'
import Layout from '@/components/layout/Layout'

// Auth pages (public)
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ActivatePage from '@/pages/auth/ActivatePage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Admin pages
import AdminPortal from '@/pages/admin/AdminPortal'
import EmployeeList from '@/pages/admin/EmployeeList'
import EditEmployee from '@/pages/admin/EditEmployee'
import CreateEmployee from '@/pages/admin/CreateEmployee'

// Role home pages
import EmployeePage from '@/pages/employee/EmployeePage'
import ClientPage from '@/pages/client/ClientPage'

import NotFoundPage from '@/pages/NotFoundPage'

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* ── Public routes ─────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── Protected routes (require auth) ─────────────────────────── */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          {/* Admin portal – requires ADMIN role */}
          <Route path="/admin" element={<PrivateRoute requiredRole="ADMIN" />}>
            <Route index element={<AdminPortal />} />
            <Route path="employees" element={<EmployeeList />} />
            <Route path="employees/new" element={<CreateEmployee />} />
            <Route path="employees/:id/edit" element={<EditEmployee />} />
          </Route>

          {/* Employee home */}
          <Route path="/employee" element={<PrivateRoute requiredRole="EMPLOYEE" />}>
            <Route index element={<EmployeePage />} />
          </Route>

          {/* Client home */}
          <Route path="/client" element={<PrivateRoute requiredRole="CLIENT" />}>
            <Route index element={<ClientPage />} />
          </Route>
        </Route>
      </Route>

      {/* ── Fallback ──────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
)

export default function App() {
  return <RouterProvider router={router} />
}
