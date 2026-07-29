import { jsPDF } from 'jspdf'
import { formatDate } from '../dashboard/DashboardPage'
import type { ReportData } from './reportData'

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

// jsPDF khong co san font Unicode co dau tieng Viet, va du an khong co san
// file font that (.ttf) de nhung qua addFileToVFS/addFont. Thay vi nhung mot
// font gia/khong hop le (se lam PDF loi hoac mat dau), dung doc.html() de
// jsPDF render DOM qua html2canvas (da co san la optional dependency cua
// jsPDF) - ket qua la anh raster cua dung noi dung tieng Viet trinh duyet da
// hien thi, dam bao khong mat dau, nhung doi lai chu trong PDF la anh, khong
// the bam chon/copy hay tim kiem duoc nhu PDF van ban that.
export async function exportReportToPdf(data: ReportData, title: string, fileBaseName: string): Promise<void> {
  const container = buildReportHtml(data, title)
  document.body.appendChild(container)

  try {
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    await new Promise<void>((resolve, reject) => {
      doc
        .html(container, {
          x: 24,
          y: 24,
          width: 547, // A4 (595pt) - 2*24pt margin
          windowWidth: 794, // ~ A4 width tai 96dpi, giup html2canvas do layout dung ty le
          autoPaging: 'slice',
          html2canvas: { scale: 0.75 },
          callback: (finishedDoc) => {
            finishedDoc.save(`${fileBaseName}.pdf`)
            resolve()
          },
        })
        .catch(reject)
    })
  } finally {
    container.remove()
  }
}

function buildReportHtml(data: ReportData, title: string): HTMLElement {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '794px'
  container.style.fontFamily = 'Arial, sans-serif'
  container.style.color = '#0f172a'
  container.style.fontSize = '12px'

  container.innerHTML = `
    <h1 style="font-size:20px;margin:0 0 4px;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px;color:#334155;">Từ ${formatDate(data.tuNgay)} đến ${formatDate(data.denNgay)}</p>
    ${renderAttendanceSection(data)}
    ${renderViolationSection(data)}
    ${renderPositiveSection(data)}
  `

  return container
}

function renderAttendanceSection(data: ReportData): string {
  const { attendance } = data
  const rowsHtml = attendance.rows
    .map(
      (row, index) => `
        <tr>
          <td style="${td}">${index + 1}</td>
          <td style="${td}">${escapeHtml(row.hoTen)}</td>
          <td style="${td}">${formatDate(row.ngay)}</td>
          <td style="${td}">${ATTENDANCE_STATUS_LABELS[row.trangThai] || row.trangThai}</td>
          <td style="${td}">${escapeHtml(row.chiTietBuoi || '—')}</td>
          <td style="${td}">${row.daLienLac ? 'Đã liên lạc' : 'Chưa liên lạc'}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 1 — Chuyên cần</h2>
    <p style="margin:4px 0 8px;">
      Học sinh nghỉ học: <strong>${attendance.soHocSinhNghi}</strong> ·
      Vắng có phép: <strong>${attendance.soLuotVangCoPhep}</strong> ·
      Vắng không phép: <strong>${attendance.soLuotVangKhongPhep}</strong> ·
      Đi trễ: <strong>${attendance.soLuotDiTre}</strong>
    </p>
    ${
      attendance.rows.length === 0
        ? '<p>Không có học sinh vắng/trễ trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr>
              <th style="${th}">STT</th><th style="${th}">Họ tên</th><th style="${th}">Ngày</th>
              <th style="${th}">Trạng thái</th><th style="${th}">Chi tiết buổi</th><th style="${th}">Đã liên lạc PH?</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
    }
  `
}

function renderViolationSection(data: ReportData): string {
  const { violation } = data
  const groupRowsHtml = violation.theoNhom
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.nhanLoai)}</td>
          <td style="${td}">${row.soLuot}</td>
          <td style="${td}">${row.soHocSinh}</td>
        </tr>`,
    )
    .join('')

  const detailRowsHtml = violation.chiTiet
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.nhanLoai)}</td>
          <td style="${td}">${escapeHtml(row.maDanhMuc || '—')}</td>
          <td style="${td}">${escapeHtml(row.tenViPham)}</td>
          <td style="${td}">${row.soLuot}</td>
          <td style="${td}">${escapeHtml(row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '))}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 2 — Vi phạm nề nếp</h2>
    <p style="margin:4px 0 8px;">
      Học sinh vi phạm: <strong>${violation.soHocSinhViPham}</strong> ·
      Tổng lượt vi phạm: <strong>${violation.tongSoLuot}</strong> ·
      Vi phạm nghiêm trọng: <strong>${violation.soViPhamNghiemTrong}</strong>
    </p>
    <p style="margin:0 0 8px;">
      Sự kiện lớp/tổ trong kỳ: <strong>${violation.suKienTapThe.tongSo}</strong> sự kiện,
      đã xử lý <strong>${violation.suKienTapThe.daXuLy}</strong>.
    </p>
    ${
      violation.theoNhom.length === 0
        ? '<p>Không có vi phạm cá nhân nào trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr><th style="${th}">Nhóm</th><th style="${th}">Số lượt</th><th style="${th}">Số học sinh liên quan</th></tr></thead>
            <tbody>${groupRowsHtml}</tbody>
          </table>
          <table style="${table}">
            <thead><tr>
              <th style="${th}">Nhóm</th><th style="${th}">Mã</th><th style="${th}">Tên vi phạm</th>
              <th style="${th}">Số lượt</th><th style="${th}">Học sinh (số lần)</th>
            </tr></thead>
            <tbody>${detailRowsHtml}</tbody>
          </table>`
    }
  `
}

function renderPositiveSection(data: ReportData): string {
  const { positive } = data
  const rowsHtml = positive.rows
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.maDanhMuc || '—')}</td>
          <td style="${td}">${escapeHtml(row.noiDung)}</td>
          <td style="${td}">${row.soLuot}</td>
          <td style="${td}">${escapeHtml(row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '))}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 3 — Ghi nhận tích cực</h2>
    <p style="margin:4px 0 8px;">
      Học sinh được ghi nhận: <strong>${positive.soHocSinh}</strong> ·
      Tổng lượt ghi nhận: <strong>${positive.tongSoLuot}</strong>
    </p>
    ${
      positive.rows.length === 0
        ? '<p>Không có ghi nhận tích cực nào trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr><th style="${th}">Mã</th><th style="${th}">Nội dung</th><th style="${th}">Số lượt</th><th style="${th}">Học sinh (số lần)</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
    }
  `
}

const h2 = 'font-size:15px;margin:16px 0 4px;color:#0f172a;'
const table = 'width:100%;border-collapse:collapse;margin-bottom:12px;'
const th = 'border:1px solid #64748b;background:#e2e8f0;padding:4px 6px;text-align:left;font-size:11px;'
const td = 'border:1px solid #94a3b8;padding:4px 6px;font-size:11px;vertical-align:top;'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
