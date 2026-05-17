import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { LoadingBlock } from '@/components/ui/feedback'

export const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)

export const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
)

export const RecoverPasswordPage = lazy(() =>
  import('@/features/auth/pages/RecoverPasswordPage').then((module) => ({
    default: module.RecoverPasswordPage,
  })),
)

export const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

export const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)

export const CurriculumPage = lazy(() =>
  import('@/features/curriculum/pages/CurriculumPage').then((module) => ({
    default: module.CurriculumPage,
  })),
)

export const SimulationPage = lazy(() =>
  import('@/features/simulation/pages/SimulationPage').then((module) => ({
    default: module.SimulationPage,
  })),
)

export const RoutesPage = lazy(() =>
  import('@/features/scenarios/pages/RoutesPage').then((module) => ({
    default: module.RoutesPage,
  })),
)

export const ComparePage = lazy(() =>
  import('@/features/scenarios/pages/ComparePage').then((module) => ({
    default: module.ComparePage,
  })),
)

export const DoubleProgramPage = lazy(() =>
  import('@/features/double-program/pages/DoubleProgramPage').then((module) => ({
    default: module.DoubleProgramPage,
  })),
)

export const AdminPage = lazy(() =>
  import('@/features/admin/pages/AdminPage').then((module) => ({
    default: module.AdminPage,
  })),
)

export const PdfIngestionPage = lazy(() =>
  import('@/features/pdf-ingestion/pages/PdfIngestionPage').then((module) => ({
    default: module.PdfIngestionPage,
  })),
)

export const ChatPage = lazy(() =>
  import('@/features/ai-chat/pages/ChatPage').then((module) => ({
    default: module.ChatPage,
  })),
)

export const AdvisorPage = lazy(() =>
  import('@/features/advisor/pages/AdvisorPage').then((module) => ({
    default: module.AdvisorPage,
  })),
)

export const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const NotFoundPage = lazy(() =>
  import('@/features/shared/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

export function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingBlock />}>{children}</Suspense>
}
