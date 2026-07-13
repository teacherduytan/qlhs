import { createHashRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CatalogPage } from './features/catalog/CatalogPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ImportPage } from './features/import/ImportPage'
import { RecordEntryPage } from './features/records/RecordEntryPage'
import { StudentProfilePage } from './features/students/StudentProfilePage'
import { StudentsPage } from './features/students/StudentsPage'
import { TeacherStudentDetailPage } from './features/students/TeacherStudentDetailPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'hoc-sinh', element: <StudentsPage /> },
      { path: 'quan-ly/hoc-sinh/:maHs', element: <TeacherStudentDetailPage /> },
      { path: 'ghi-nhan', element: <RecordEntryPage /> },
      { path: 'danh-muc', element: <CatalogPage /> },
      { path: 'import', element: <ImportPage /> },
    ],
  },
  {
    path: '/hs/:token',
    element: <StudentProfilePage />,
  },
])
