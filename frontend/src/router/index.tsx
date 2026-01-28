import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Home from '@/pages/Home'
import Login from '@/pages/auth/Login'
import SignUp from '@/pages/auth/SignUp'
import VerifyEmail from '@/pages/auth/VerifyEmail'
import ResetPassword from '@/pages/auth/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import JobDetail from '@/pages/JobDetail'
import ResumeCompare from '@/pages/ResumeCompare'
import ResumeView from '@/pages/ResumeView'
import ResumeManagement from '@/pages/ResumeManagement'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/jobs/:id',
    element: (
      <ProtectedRoute>
        <JobDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/resumes/compare/:jobId',
    element: (
      <ProtectedRoute>
        <ResumeCompare />
      </ProtectedRoute>
    ),
  },
  {
    path: '/resumes/view',
    element: (
      <ProtectedRoute>
        <ResumeView />
      </ProtectedRoute>
    ),
  },
  {
    path: '/resumes',
    element: (
      <ProtectedRoute>
        <ResumeManagement />
      </ProtectedRoute>
    ),
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
