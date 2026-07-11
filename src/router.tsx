import { createHashRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ImportPage } from './features/import/ImportPage'
import { StudentProfilePage } from './features/students/StudentProfilePage'
import { StudentsPage } from './features/students/StudentsPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'hoc-sinh', element: <StudentsPage /> },
      { path: 'import', element: <ImportPage /> },
    ],
  },
  {
    path: '/hs/:token',
    element: <StudentProfilePage />,
  },
])
