import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  AdminPage,
  AdvisorPage,
  ChatPage,
  ComparePage,
  CurriculumPage,
  DashboardPage,
  DoubleProgramPage,
  LoginPage,
  NotFoundPage,
  PdfIngestionPage,
  ProfilePage,
  RecoverPasswordPage,
  RegisterPage,
  RouteSuspense,
  RoutesPage,
  SettingsPage,
  SimulationPage,
} from '@/app/lazyPages'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RequireRole } from '@/features/auth/components/RequireRole'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <RouteSuspense>
        <LoginPage />
      </RouteSuspense>
    ),
  },
  {
    path: '/registro',
    element: (
      <RouteSuspense>
        <RegisterPage />
      </RouteSuspense>
    ),
  },
  {
    path: '/recuperar-clave',
    element: (
      <RouteSuspense>
        <RecoverPasswordPage />
      </RouteSuspense>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['student']} fallbackRoleLabel="estudiante">
                  <DashboardPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/perfil',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['student']} fallbackRoleLabel="estudiante">
                  <ProfilePage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/malla',
            element: (
              <RouteSuspense>
                <RequireRole
                  allowedRoles={['student', 'advisor']}
                  fallbackRoleLabel="estudiante o asesor"
                >
                  <CurriculumPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/simulacion',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['student']} fallbackRoleLabel="estudiante">
                  <SimulationPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/rutas',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['student']} fallbackRoleLabel="estudiante">
                  <RoutesPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/comparar',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['student']} fallbackRoleLabel="estudiante">
                  <ComparePage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/doble-programa',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['student']} fallbackRoleLabel="estudiante">
                  <DoubleProgramPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/admin',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['admin']} fallbackRoleLabel="administrador">
                  <AdminPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/admin/cargar-pdf',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['admin']} fallbackRoleLabel="administrador">
                  <PdfIngestionPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/chat',
            element: (
              <RouteSuspense>
                <RequireRole
                  allowedRoles={['student', 'admin']}
                  fallbackRoleLabel="estudiante o administrador"
                >
                  <ChatPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/asesor',
            element: (
              <RouteSuspense>
                <RequireRole allowedRoles={['advisor']} fallbackRoleLabel="asesor">
                  <AdvisorPage />
                </RequireRole>
              </RouteSuspense>
            ),
          },
          {
            path: '/configuracion',
            element: (
              <RouteSuspense>
                <SettingsPage />
              </RouteSuspense>
            ),
          },
          {
            path: '*',
            element: (
              <RouteSuspense>
                <NotFoundPage />
              </RouteSuspense>
            ),
          },
        ],
      },
    ],
  },
])
