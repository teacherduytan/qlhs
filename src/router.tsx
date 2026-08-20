import { createHashRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AttendanceManagementPage } from './features/attendance/AttendanceManagementPage'
import { AttendanceReportPage } from './features/attendance/AttendanceReportPage'
import { CatalogPage } from './features/catalog/CatalogPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DocumentsPage } from './features/documents/DocumentsPage'
import { ImportPage } from './features/import/ImportPage'
import { MessageBatchesPage } from './features/students/MessageBatchesPage'
import { ParentContactHistoryPage } from './features/attendance/ParentContactHistoryPage'
import { RecordEntryPage } from './features/records/RecordEntryPage'
import { RuleManagerPage } from './features/companion/RuleManagerPage'
import { ReportsPage } from './features/reports/ReportsPage'
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
      { path: 'diem-danh', element: <AttendanceManagementPage /> },
      { path: 'lien-lac-phu-huynh', element: <ParentContactHistoryPage /> },
      { path: 'tin-nhan-phu-huynh', element: <MessageBatchesPage /> },
      { path: 'bao-cao-si-so', element: <AttendanceReportPage /> },
      { path: 'bao-cao', element: <ReportsPage /> },
      { path: 'danh-muc', element: <CatalogPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'dong-hanh', element: <RuleManagerPage /> },
      { path: 'tai-lieu', element: <DocumentsPage /> },
    ],
  },
  {
    path: '/hs/:token',
    element: <StudentProfilePage />,
  },
])
