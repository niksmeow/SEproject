import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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
    element: <Dashboard />,
  },
  {
    path: '/jobs/:id',
    element: <JobDetail />,
  },
  {
    path: '/resumes/compare/:jobId',
    element: <ResumeCompare />,
  },
  {
    path: '/resumes/view',
    element: <ResumeView />,
  },
  {
    path: '/resumes',
    element: <ResumeManagement />,
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
