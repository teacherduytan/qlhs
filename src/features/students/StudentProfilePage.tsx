import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BanCanSu, HocSinh } from '../../data/types'

type ProfileState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'success'; student: HocSinh; role: string }

export function StudentProfilePage() {
  const { token } = useParams()
  const [state, setState] = useState<ProfileState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    if (!token) {
      setState({ status: 'not_found' })
      return
    }

    Promise.all([dataSource.getStudentByToken(token), dataSource.getBanCanSu()])
      .then(([student, banCanSu]) => {
        if (!active) {
          return
        }

        if (!student) {
          setState({ status: 'not_found' })
          return
        }

        setState({
          status: 'success',
          student,
          role: getStudentRole(student.ma_hs, banCanSu),
        })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được hồ sơ học sinh.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [token])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
            <h1 className="text-xl font-bold text-slate-900">Hồ sơ học sinh</h1>
          </div>
          <Link
            to="/"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Về trang chính
          </Link>
        </div>

        {state.status === 'loading' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Đang tải hồ sơ...
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {state.message}
          </div>
        ) : null}

        {state.status === 'not_found' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Không tìm thấy hồ sơ</h2>
            <p className="mt-2 text-sm text-slate-600">
              Link hồ sơ không hợp lệ hoặc token đã được thay đổi.
            </p>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <ProfileCard student={state.student} role={state.role} />
        ) : null}
      </section>
    </main>
  )
}

function ProfileCard({ role, student }: { role: string; student: HocSinh }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {student.ten.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-700">{role}</p>
            <h2 className="text-2xl font-bold text-slate-950">
              {student.ho} {student.ten}
            </h2>
            <p className="text-sm text-slate-600">Mã học sinh: {student.ma_hs}</p>
          </div>
        </div>
      </div>

      <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
        <InfoItem label="Số thứ tự" value={String(student.tt)} />
        <InfoItem label="Diện" value={student.dien} />
        <InfoItem label="Giới tính" value={student.nu ? 'Nữ' : 'Nam'} />
        <InfoItem label="Dân tộc" value={student.dan_toc || '-'} />
        <InfoItem label="Ngày sinh" value={formatDate(student.ngay_sinh)} />
        <InfoItem label="Cờ đỏ" value={student.la_co_do ? 'Có' : 'Không'} />
        <InfoItem label="Ngày nhập học" value={formatDate(student.ngay_nhap_hoc)} />
        <InfoItem label="Trạng thái" value={student.ngay_roi_lop ? 'Đã rời lớp' : 'Đang học'} />
      </dl>

      {student.ghi_chu ? (
        <div className="border-t border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Ghi chú</p>
          <p className="mt-1 text-sm text-slate-600">{student.ghi_chu}</p>
        </div>
      ) : null}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</dd>
    </div>
  )
}

function getStudentRole(maHs: string, banCanSu: BanCanSu[]): string {
  const role = banCanSu.find((item) => item.ma_hs === maHs)
  return role?.chuc_vu || 'Học sinh'
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN').format(date)
}
