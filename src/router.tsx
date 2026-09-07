import { createHashRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AttendanceManagementPage } from './features/attendance/AttendanceManagementPage'
import { AttendanceReportPage } from './features/attendance/AttendanceReportPage'
import { CatalogPage } from './features/catalog/CatalogPage'
import { Cs2AdminPage } from './features/cs2/Cs2AdminPage'
import { Cs2LookupPage } from './features/cs2/Cs2LookupPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DocumentsPage } from './features/documents/DocumentsPage'
import { ImportPage } from './features/import/ImportPage'
import { MeetingInvitationPage } from './features/meetings/MeetingInvitationPage'
import { MessageBatchesPage } from './features/students/MessageBatchesPage'
import { ParentContactHistoryPage } from './features/attendance/ParentContactHistoryPage'
import { ParentProfilePage } from './features/students/ParentProfilePage'
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
      { path: 'thu-moi-hop', element: <MeetingInvitationPage /> },
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
  {
    path: '/ph/:token',
    element: <ParentProfilePage />,
  },
  // Tinh nang thu thap thong tin lien lac/CCCD hoc sinh CS2 (spec 16,
  // docs/thuthapthongtincs2/) - doc lap hoan toan voi app 11C5, khong nam
  // trong Layout/menu chinh, khong dung DataSource cua app 11C5.
  {
    path: '/cs2/tra-cuu',
    element: <Cs2LookupPage />,
  },
  {
    path: '/cs2/quan-tri',
    element: <Cs2AdminPage />,
  },
])
